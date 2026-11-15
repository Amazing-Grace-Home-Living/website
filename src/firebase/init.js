// src/firebase/init.js
// Firebase initialization for the Amazing Grace project.
// Replace the placeholder config with the values from your Firebase console.

import { initializeApp } from "firebase/app";
import { getAuth, EmailAuthProvider, GoogleAuthProvider, PhoneAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Insert your actual Firebase config here. You can copy it from the
// Firebase console (Project Settings → General → Your apps).
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "nicholai-online.firebaseapp.com",
  projectId: "nicholai-online",
  storageBucket: "nicholai-online.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Set up Auth providers
export const auth = getAuth(app);
export const emailProvider = new EmailAuthProvider();
export const googleProvider = new GoogleAuthProvider();
export const phoneProvider = new PhoneAuthProvider(auth);

// Initialize Firestore
export const db = getFirestore(app);

// Example usage (you can import these in your app code):
// signInWithEmailAndPassword(auth, email, password)
// signInWithPopup(auth, googleProvider)
// signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier)

export default app;
