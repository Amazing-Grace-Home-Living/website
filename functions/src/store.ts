import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

initializeApp();
const db = getFirestore();

/**
 * Purchase points with real money (simulated). 1$ = 100 points.
 * Expected body: { uid: string, dollars: number }
 */
export const purchasePoints = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  const { uid, dollars } = req.body as { uid: string; dollars: number };
  if (!uid || typeof dollars !== 'number' || dollars <= 0) {
    res.status(400).json({ error: 'Invalid uid or dollars' });
    return;
  }
  const points = Math.round(dollars * 100);
  const userRef = db.collection('users').doc(uid);
  await db.runTransaction(async t => {
    const snap = await t.get(userRef);
    const current = snap.data()?.points ?? 0;
    t.set(userRef, { points: current + points }, { merge: true });
  });
  logger.info('Purchased points with money', { uid, dollars, points });
  res.json({ success: true, uid, dollars, pointsAdded: points });
});

/**
 * Purchase a VIP tier (monthly or annual).
 * Expected body: { uid: string, tier: 'vip_monthly' | 'vip_annual' }
 */
export const purchaseVIP = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  const { uid, tier } = req.body as { uid: string; tier: string };
  if (!uid || (tier !== 'vip_monthly' && tier !== 'vip_annual')) {
    res.status(400).json({ error: 'Invalid uid or tier' });
    return;
  }
  const accessLevel = tier; // store raw string for simplicity
  const userRef = db.collection('users').doc(uid);
  await userRef.set({ accessLevel, vipStart: new Date() }, { merge: true });
  logger.info('VIP purchase', { uid, tier });
  res.json({ success: true, uid, tier });
});

/**
 * Purchase additional storage using points.
 * Expected body: { uid: string, size: number, cost: number }
 * size in MB, cost in points.
 */
export const purchaseStorage = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  const { uid, size, cost } = req.body as { uid: string; size: number; cost: number };
  if (!uid || typeof size !== 'number' || typeof cost !== 'number') {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }
  const userRef = db.collection('users').doc(uid);
  await db.runTransaction(async t => {
    const snap = await t.get(userRef);
    const data = snap.data() ?? {};
    const currentStorage = data.storageQuotaMb ?? 0;
    const currentPoints = data.points ?? 0;
    if (currentPoints < cost) {
      throw new Error('Insufficient points for storage purchase');
    }
    t.set(
      userRef,
      {
        storageQuotaMb: currentStorage + size,
        points: currentPoints - cost
      },
      { merge: true }
    );
  }).catch(err => {
    logger.error('Storage purchase error', err);
    res.status(400).json({ error: err.message });
    return;
  });
  logger.info('Storage purchased', { uid, size, cost });
  res.json({ success: true, uid, size, cost });
});
