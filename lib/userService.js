// lib/userService.js
import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Creates or updates a user profile record in the 'users' collection.
 */
export async function updateUserProfile(userId, { username, email }) {
  const userRef = doc(db, "users", userId);
  await setDoc(
    userRef,
    {
      username: username || "Guest",
      email: email || "",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Updates scores, credits, and XP for a given user.
 */
export async function recordUserScore(userId, { score = 0, creditsEarned = 0, xpEarned = 0 }) {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    // Create new profile if it doesn't exist yet
    await setDoc(userRef, {
      credits: creditsEarned,
      highScore: score,
      xp: xpEarned,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }
  const currentData = snap.data();
  const newHighScore = Math.max(currentData.highScore || 0, score);
  await updateDoc(userRef, {
    credits: increment(creditsEarned),
    xp: increment(xpEarned),
    highScore: newHighScore,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Retrieves a user's full profile, score, and credit balance.
 */
export async function getUserProfile(userId) {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() };
  }
  return null;
}
