const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

/**
 * HTTP endpoint called by the donation processor.
 * Expected payload: { uid: string, amount: number }
 * • Adds `points = amount * 100` to the user's wallet.
 * • Writes an immutable donation document under /donations/{generatedId}.
 */
exports.creditPointsOnDonation = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }
    const { uid, amount } = req.body;
    if (!uid || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).send('Invalid payload');
    }
    const points = Math.round(amount * 100);
    const walletRef = db.collection('wallets').doc(uid);
    // Transaction: update wallet and create donation record
    await db.runTransaction(async (t) => {
      const walletSnap = await t.get(walletRef);
      const cur = walletSnap.exists ? walletSnap.data().points || 0 : 0;
      t.set(walletRef, { points: cur + points }, { merge: true });
      const donationRef = db.collection('donations').doc();
      t.set(donationRef, {
        uid,
        amount,
        points,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    return res.json({ success: true, addedPoints: points });
  } catch (err) {
    console.error('Error crediting points:', err);
    return res.status(500).send('Internal Server Error');
  }
});
