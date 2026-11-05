import { onDocumentCreated, FirestoreEvent } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * Trigger when a donation document is created.
 * Expected fields: uid (string), amount (number) – amount in USD.
 * Grants 100 points per dollar to the donating user.
 */
export const onDonationCreated = onDocumentCreated(
  { document: 'donations/{donationId}', region: 'us-central1' },
  async (event: FirestoreEvent<any>) => {
    const data = event.data?.data();
    if (!data) return;
    const { uid, amount } = data;
    if (!uid || typeof amount !== 'number' || amount <= 0) {
      logger.warn('Invalid donation payload', { uid, amount });
      return;
    }
    const points = Math.floor(amount * 100);
    const userRef = db.collection('users').doc(uid);
    await db.runTransaction(async (t) => {
      const snap = await t.get(userRef);
      const current = snap.data()?.points ?? 0;
      t.set(userRef, { points: current + points }, { merge: true });
    });
    logger.info('Granted donation points', { uid, amount, points });
  }
);
