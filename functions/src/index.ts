import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { validLemonSqueezySignature, webhookFingerprint, validLemonSqueezyEvent } from './webhook-security';
import * as logger from 'firebase-functions/logger';

if (!getApps().length) initializeApp();
const db = getFirestore();
const lemonSqueezyWebhookSecret = defineSecret('LEMON_SQUEEZY_WEBHOOK_SECRET');

export const apiHealth = onRequest(
  { cors: true, region: 'us-central1' },
  async (_req, res): Promise<void> => {
    res.status(200).json({
      status: 'online',
      environment: process.env.FUNCTIONS_EMULATOR === 'true' ? 'emulator' : 'production',
      timestamp: new Date().toISOString()
    });
  }
);

export const onUserCreated = onDocumentCreated(
  { document: 'users/{userId}', region: 'us-central1' },
  async event => {
    if (!event.data) return;
    await db.collection('profiles').doc(event.params.userId).set(
      { createdAt: new Date() },
      { merge: true }
    );
  }
);

export { grantPoints, spendPoints } from './points';

/**
 * Verified Lemon Squeezy webhook. The raw body, not re-serialized JSON,
 * must be signed with the configured webhook signing secret.
 * Unsigned payloads cannot be used to fabricate payment events.
 */
export const lemonSqueezyWebhook = onRequest(
  { region: 'us-central1', secrets: [lemonSqueezyWebhookSecret] },
  async (req, res): Promise<void> => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const raw = req.rawBody;
    if (!validLemonSqueezySignature(raw, req.get('X-Signature'), lemonSqueezyWebhookSecret.value())) {
      res.status(401).send('Invalid webhook signature');
      return;
    }

    const payload = req.body;
    if (!validLemonSqueezyEvent(payload, req.get('X-Event-Name'))) {
      res.status(400).send('Invalid webhook event');
      return;
    }

    try {
      // Lemon Squeezy retries failed deliveries. Content-addressed IDs prevent
      // duplicate records from identical signed payloads, even concurrently.
      // Business actions also require their own provider-resource idempotency.
      const paymentRef = db.collection('payments').doc(webhookFingerprint(raw));
      await db.runTransaction(async tx => {
        const existing = await tx.get(paymentRef);
        if (existing.exists) return;
        tx.create(paymentRef, {
          receivedAt: new Date(),
          eventName: payload.meta.event_name,
          resourceType: payload.data.type,
          resourceId: payload.data.id,
          payload
        });
      });
      res.status(200).send('OK');
    } catch (error) {
      logger.error('Unable to save verified Lemon Squeezy webhook', error);
      res.status(500).send('Internal Server Error');
    }
  }
);
