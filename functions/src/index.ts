import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { createHmac, timingSafeEqual } from 'node:crypto';
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

    const secret = lemonSqueezyWebhookSecret.value();
    const signature = req.get('X-Signature') || '';
    const raw = req.rawBody;

    if (!secret || !Buffer.isBuffer(raw) || !/^[0-9a-f]{64}$/i.test(signature)) {
      res.status(401).send('Invalid webhook signature');
      return;
    }
    const received = Buffer.from(signature, 'hex');
    const expected = createHmac('sha256', secret).update(raw).digest();
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      res.status(401).send('Invalid webhook signature');
      return;
    }

    const payload = req.body;
    if (!payload || typeof payload !== 'object' || !payload.data || typeof payload.data !== 'object') {
      res.status(400).send('Invalid webhook payload');
      return;
    }

    try {
      await db.collection('payments').add({
        receivedAt: new Date(),
        eventName: req.get('X-Event-Name') || null,
        payload
      });
      logger.info('Stored verified Lemon Squeezy webhook');
      res.status(200).send('OK');
    } catch (error) {
      logger.error('Unable to save verified Lemon Squeezy webhook', error);
      res.status(500).send('Internal Server Error');
    }
  }
);
