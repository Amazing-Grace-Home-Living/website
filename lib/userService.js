// lib/userService.js
import { db } from "./firebase";
import { collection, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export const getUserProfile = async (uid) => {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data();
  }
  return null;
};

export const createOrUpdateUserProfile = async (uid, profile) => {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, profile, { merge: true });
};

export const incrementUserScore = async (uid, delta) => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { score: increment(delta) });
};
