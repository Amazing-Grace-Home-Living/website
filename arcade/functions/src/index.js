const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();
const db = admin.firestore();
const DONATION_WEBHOOK_SECRET = process.env.DONATION_WEBHOOK_SECRET;
const MAX_DONATION_AMOUNT = 10000;

function hasValidDonationSignature(req) {
  if (!DONATION_WEBHOOK_SECRET) {
    console.error('Missing DONATION_WEBHOOK_SECRET environment variable.');
    return false;
  }

  const receivedSignature = req.get('x-donation-signature');
  if (typeof receivedSignature !== 'string' || receivedSignature.length === 0) {
    return false;
  }

  if (!req.rawBody || !(req.rawBody instanceof Buffer)) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', DONATION_WEBHOOK_SECRET)
    .update(req.rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const receivedBuffer = Buffer.from(receivedSignature.trim(), 'utf8');
  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, message: 'Invalid payload' };
  }

  const { uid, amount, donationId } = payload;
  if (typeof uid !== 'string' || uid.length === 0 || uid.length > 128) {
    return { ok: false, message: 'Invalid uid' };
  }

  if (
    typeof donationId !== 'string' ||
    !/^[A-Za-z0-9_-]{6,128}$/.test(donationId)
  ) {
    return { ok: false, message: 'Invalid donationId' };
  }

  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > MAX_DONATION_AMOUNT
  ) {
    return { ok: false, message: 'Invalid amount' };
  }

  return { ok: true, uid, amount, donationId };
}

/**
 * HTTP endpoint called by the donation processor.
 * Expected payload: { uid: string, amount: number, donationId: string }
 * • Adds `points = amount * 100` to the user's wallet.
 * • Writes an immutable donation document under /donations/{donationId}.
 * This endpoint requires a valid HMAC SHA-256 signature in x-donation-signature.
 */
exports.creditPointsOnDonation = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    if (!hasValidDonationSignature(req)) {
      return res.status(401).send('Unauthorized');
    }

    const validated = validatePayload(req.body);
    if (!validated.ok) {
      return res.status(400).send(validated.message);
    }

    const { uid, amount, donationId } = validated;
    const points = Math.round(amount * 100);
    const walletRef = db.collection('wallets').doc(uid);
    const donationRef = db.collection('donations').doc(donationId);
    let credited = false;

    // Transaction: idempotent donation write + wallet credit.
    await db.runTransaction(async (t) => {
      const donationSnap = await t.get(donationRef);
      if (donationSnap.exists) {
        return;
      }

      const walletSnap = await t.get(walletRef);
      const cur = walletSnap.exists ? walletSnap.data().points || 0 : 0;
      t.set(
        walletRef,
        {
          points: cur + points,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      t.set(donationRef, {
        uid,
        amount,
        points,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      credited = true;
    });
    return res.json({
      success: true,
      donationId,
      credited,
      addedPoints: credited ? points : 0,
    });
  } catch (err) {
    console.error('Error crediting points:', err);
    return res.status(500).send('Internal Server Error');
  }
});
