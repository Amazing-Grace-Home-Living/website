import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

initializeApp();
const db = getFirestore();

/**
 * HTTP endpoint to grant points to a user.
 * Expects JSON body: { uid: string, amount: number }
 */
export const grantPoints = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  const { uid, amount } = req.body as { uid: string; amount: number };
  if (!uid || typeof amount !== 'number' || amount <= 0) {
    res.status(400).json({ error: 'Invalid uid or amount' });
    return;
  }
  const userRef = db.collection('users').doc(uid);
  await db.runTransaction(async (t) => {
    const snap = await t.get(userRef);
    const current = snap.data()?.points ?? 0;
    t.set(userRef, { points: current + amount }, { merge: true });
  });
  logger.info('Granted points', { uid, amount });
  res.json({ success: true, uid, added: amount });
});

/**
 * HTTP endpoint to spend points.
 * Expects JSON body: { uid: string, amount: number, description?: string }
 */
export const spendPoints = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  const { uid, amount, description } = req.body as { uid: string; amount: number; description?: string };
  if (!uid || typeof amount !== 'number' || amount <= 0) {
    res.status(400).json({ error: 'Invalid uid or amount' });
    return;
  }
  const userRef = db.collection('users').doc(uid);
  await db.runTransaction(async (t) => {
    const snap = await t.get(userRef);
    const current = snap.data()?.points ?? 0;
    if (current < amount) {
      throw new Error('Insufficient points');
    }
    t.set(userRef, { points: current - amount }, { merge: true });
    // optional audit log
    const logRef = db.collection('pointTransactions').doc();
    t.set(logRef, { uid, amount: -amount, description: description ?? '', timestamp: new Date() });
  }).catch((e) => {
    logger.error('Spend points error', e);
    res.status(400).json({ error: e.message });
    return;
  });
  logger.info('Spent points', { uid, amount, description });
  res.json({ success: true, uid, spent: amount });
});
