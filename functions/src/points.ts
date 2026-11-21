import { onRequest, type Request } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps } from 'firebase-admin/app';

if (!getApps().length) initializeApp();
const db = getFirestore();

// The browser's Firebase API key is public. Never accept a claimed uid,
// point amount, or admin status without verifying a Firebase ID token.
async function authenticatedUser(req: Request): Promise<{ uid: string; admin: boolean } | null> {
  const authorization = req.get('authorization') || '';
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  if (!match) return null;
  try {
    const claims = await getAuth().verifyIdToken(match[1], true);
    return { uid: claims.uid, admin: claims.admin === true };
  } catch {
    return null;
  }
}

function validPoints(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= 100000;
}

/**
 * Administrative grant only. Payments and gameplay must grant rewards through
 * a trusted, verified server-side flow, never by submitting a client amount.
 */
export const grantPoints = onRequest({ cors: true }, async (req, res): Promise<void> => {
  if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }
  const caller = await authenticatedUser(req);
  if (!caller) { res.status(401).json({ error: 'Authentication required' }); return; }
  if (!caller.admin) { res.status(403).json({ error: 'Administrator authorization required' }); return; }

  const { uid, amount } = req.body || {};
  if (typeof uid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(uid) || !validPoints(amount)) {
    res.status(400).json({ error: 'Invalid uid or amount' });
    return;
  }

  try {
    const userRef = db.collection('users').doc(uid);
    await db.runTransaction(async t => {
      const snap = await t.get(userRef);
      const current = snap.data()?.points ?? 0;
      if (!Number.isSafeInteger(current) || current < 0 || !Number.isSafeInteger(current + amount)) {
        throw new Error('Invalid points balance');
      }
      t.set(userRef, { points: current + amount }, { merge: true });
    });
    logger.info('Administrator granted points', { uid, amount });
    res.json({ success: true, uid, added: amount });
  } catch (error) {
    logger.error('Grant points failed', error);
    res.status(500).json({ error: 'Unable to grant points' });
  }
});

/** Spending is limited to the authenticated owner, not a supplied uid. */
export const spendPoints = onRequest({ cors: true }, async (req, res): Promise<void> => {
  if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }
  const caller = await authenticatedUser(req);
  if (!caller) { res.status(401).json({ error: 'Authentication required' }); return; }

  const { uid, amount, description } = req.body || {};
  if ((uid !== undefined && uid !== caller.uid) || !validPoints(amount)
      || (description !== undefined && (typeof description !== 'string' || description.length > 200))) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  try {
    const userRef = db.collection('users').doc(caller.uid);
    await db.runTransaction(async t => {
      const snap = await t.get(userRef);
      const current = snap.data()?.points ?? 0;
      if (!Number.isSafeInteger(current) || current < amount) {
        throw new Error('Insufficient points');
      }
      t.set(userRef, { points: current - amount }, { merge: true });
      const logRef = db.collection('pointTransactions').doc();
      t.set(logRef, { uid: caller.uid, amount: -amount, description: description || '', timestamp: new Date() });
    });
    res.json({ success: true, uid: caller.uid, spent: amount });
  } catch (error) {
    logger.warn('Spend points rejected', { uid: caller.uid });
    res.status(400).json({ error: 'Unable to spend points' });
  }
});
