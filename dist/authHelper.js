// authHelper.js – client‑side utilities for authentication, points, store and high‑scores
// Load after firebase SDK (firebase-app-compat.js, firebase-auth-compat.js) is available.

window.authHelper = {
  // ---------- Auth ----------
  signInGoogle: async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    await firebase.auth().signInWithPopup(provider);
  },
  signInMicrosoft: async () => {
    const provider = new firebase.auth.OAuthProvider('microsoft.com');
    await firebase.auth().signInWithPopup(provider);
  },
  signOut: async () => {
    await firebase.auth().signOut();
  },
  getCurrentUser: () => firebase.auth().currentUser,

  // ---------- User data (points, credits, access level) ----------
  /**
   * Retrieves the user document from Firestore. Expected fields:
   *   points      – number
   *   credits     – number (optional, can be used for donations)
   *   accessLevel – string (e.g., "free", "vip_monthly", "vip_annual")
   */
  getUserData: async () => {
    const user = firebase.auth().currentUser;
    if (!user) return null;
    const snap = await firebase.firestore().collection('users').doc(user.uid).get();
    return snap.exists ? snap.data() : null;
  },

  // ---------- Points API ----------
  addPoints: async (amount) => {
    const uid = firebase.auth().currentUser?.uid;
    if (!uid) throw new Error('User not signed in');
    const resp = await fetch('https://us-central1-amazing-grace-hl.cloudfunctions.net/grantPoints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, amount })
    });
    return resp.json();
  },
  spendPoints: async (amount, description = '') => {
    const uid = firebase.auth().currentUser?.uid;
    if (!uid) throw new Error('User not signed in');
    const resp = await fetch('https://us-central1-amazing-grace-hl.cloudfunctions.net/spendPoints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, amount, description })
    });
    return resp.json();
  },

  // ---------- Store purchases (money) ----------
  /**
   * Purchase points with real money. 1 $ = 100 points.
   */
  purchasePointsWithMoney: async (dollars) => {
    const uid = firebase.auth().currentUser?.uid;
    if (!uid) throw new Error('User not signed in');
    const resp = await fetch('https://us-central1-amazing-grace-hl.cloudfunctions.net/purchasePoints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, dollars })
    });
    return resp.json();
  },

  /**
   * Purchase a VIP tier. `tier` values:
   *   "vip_monthly" – $20 / month → 75 points per month
   *   "vip_annual"  – $75 / year  → 900 points per year
   */
  purchaseVIP: async (tier) => {
    const uid = firebase.auth().currentUser?.uid;
    if (!uid) throw new Error('User not signed in');
    const resp = await fetch('https://us-central1-amazing-grace-hl.cloudfunctions.net/purchaseVIP', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, tier })
    });
    return resp.json();
  },

  // ---------- Storage add‑ons (points‑based) ----------
  /**
   * Buy extra storage with points. `plan` values match the pricing table:
   *   {size:1, cost:100}, {size:5, cost:400}, {size:10, cost:750}, {size:50, cost:3000}
   */
  purchaseStorageWithPoints: async (size, cost) => {
    const uid = firebase.auth().currentUser?.uid;
    if (!uid) throw new Error('User not signed in');
    const resp = await fetch('https://us-central1-amazing-grace-hl.cloudfunctions.net/purchaseStorage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, size, cost })
    });
    return resp.json();
  },

  // ---------- High‑score submission ----------
  /**
   * Submit a score. If the user is signed‑in, the uid is stored; otherwise a customName is required.
   * Server‑side Cloud Function (onScoreSubmitted) will award points for a new personal record.
   */
  submitScore: async (gameId, score, customName = null) => {
    const uid = firebase.auth().currentUser?.uid;
    const payload = uid ? { uid, score } : { customName, score };
    const coll = firebase.firestore().collection('games').doc(gameId).collection('leaderboard');
    await coll.add(payload);
    // No return value needed; UI can refresh leaderboard after this call.
  }
};
