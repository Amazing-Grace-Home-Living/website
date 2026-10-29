import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// 1. Fetch or initialize player progress profile
export const getProfile = onCall({cors: true}, async (request) => {
  const userId = request.auth?.uid || (request.data?.userId as string);
  if (!userId) {
    throw new HttpsError("invalid-argument", "Missing userId or authentication.");
  }

  const profileRef = db.collection("players").doc(userId);
  const snap = await profileRef.get();

  if (!snap.exists) {
    const initialProfile = {
      userId,
      points: 100, // starting bonus
      gamesPlayed: 0,
      highestWave: 0,
      unlockedTowers: ["basic_pulse"],
      inventory: ["tactical_core_v1"],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await profileRef.set(initialProfile);
    return {profile: initialProfile};
  }

  return {profile: snap.data()};
});

// 2. Award points from completed levels, quizzes, or match-3 combos
export const recordGameResult = onCall({cors: true}, async (request) => {
  const userId = request.auth?.uid || (request.data?.userId as string);
  const pointsEarned = Number(request.data?.pointsEarned || 0);
  const gameType = (request.data?.gameType as string) || "arcade";
  const waveReached = Number(request.data?.waveReached || 0);

  if (!userId) {
    throw new HttpsError("invalid-argument", "Missing userId.");
  }
  if (pointsEarned < 0 || pointsEarned > 100000) {
    throw new HttpsError("out-of-range", "Invalid points amount.");
  }

  const profileRef = db.collection("players").doc(userId);

  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(profileRef);
    const data = snap.exists ? snap.data()! : {points: 0, highestWave: 0, gamesPlayed: 0};

    const newPoints = (data.points || 0) + pointsEarned;
    const newHighestWave = Math.max(data.highestWave || 0, waveReached);
    const newGamesPlayed = (data.gamesPlayed || 0) + 1;

    transaction.set(
      profileRef,
      {
        points: newPoints,
        highestWave: newHighestWave,
        gamesPlayed: newGamesPlayed,
        lastPlayedGame: gameType,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true}
    );

    return {
      success: true,
      points: newPoints,
      highestWave: newHighestWave,
      pointsEarned,
    };
  });
});

// 3. Purchase upgrades (new towers, drone aids, cosmetics, storage)
export const purchaseItem = onCall({cors: true}, async (request) => {
  const userId = request.auth?.uid || (request.data?.userId as string);
  const itemId = request.data?.itemId as string;
  const cost = Number(request.data?.cost || 0);
  const itemType = (request.data?.itemType as string) || "upgrade"; // tower, cosmetic, perk

  if (!userId || !itemId || cost < 0) {
    throw new HttpsError("invalid-argument", "Invalid purchase request parameters.");
  }

  const profileRef = db.collection("players").doc(userId);

  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(profileRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Player profile not found.");
    }

    const data = snap.data()!;
    const currentPoints = data.points || 0;

    if (currentPoints < cost) {
      throw new HttpsError("failed-precondition", "Insufficient points for this purchase.");
    }

    const unlockedTowers = new Set<string>(data.unlockedTowers || ["basic_pulse"]);
    const inventory = new Set<string>(data.inventory || []);

    if (itemType === "tower") {
      unlockedTowers.add(itemId);
    } else {
      inventory.add(itemId);
    }

    const newPoints = currentPoints - cost;

    transaction.update(profileRef, {
      points: newPoints,
      unlockedTowers: Array.from(unlockedTowers),
      inventory: Array.from(inventory),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      newPoints,
      unlockedTowers: Array.from(unlockedTowers),
      inventory: Array.from(inventory),
    };
  });
});

// 4. Arcade Leaderboard
export const getLeaderboard = onCall({cors: true}, async (request) => {
  const limit = Math.min(Number(request.data?.limit || 10), 50);

  const snap = await db
    .collection("players")
    .orderBy("highestWave", "desc")
    .limit(limit)
    .get();

  const leaders = snap.docs.map((doc) => ({
    userId: doc.id,
    highestWave: doc.data().highestWave || 0,
    points: doc.data().points || 0,
    gamesPlayed: doc.data().gamesPlayed || 0,
  }));

  return {leaders};
});
