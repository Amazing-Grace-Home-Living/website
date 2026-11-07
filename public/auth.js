// Firebase initialization and auth handlers for Amazing Grace
// Replace the placeholder config with your project's Firebase config.
const firebaseConfig = {
  apiKey: "AIzaSyDbc-imBd_m9CQ-39kbmLbNeY5Itw4nZXI",
  authDomain: "amazing-grace-hl.firebaseapp.com",
  projectId: "amazing-grace-hl",
  storageBucket: "amazing-grace-hl.firebasestorage.app",
  messagingSenderId: "1081883726845",
  appId: "1:1081883726845:web:459ef37b4ad8a72911ff94"
};

// Initialize Firebase App
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch((e) => console.error('Persistence error', e));
const userStatusEl = document.getElementById('user-status');
const googleBtn = document.getElementById('googleBtn');
const microsoftBtn = document.getElementById('microsoftBtn');
const signOutBtn = document.getElementById('signOutBtn');

googleBtn.addEventListener('click', async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
  } catch (e) {
    console.error('Google sign‑in error', e);
  }
});

microsoftBtn.addEventListener('click', async () => {
  const provider = new firebase.auth.OAuthProvider('microsoft.com');
  try {
    await auth.signInWithPopup(provider);
  } catch (e) {
    console.error('Microsoft sign‑in error', e);
  }
});

signOutBtn.addEventListener('click', async () => {
  await auth.signOut();
});

auth.onAuthStateChanged((user) => {
  if (user) {
    userStatusEl.textContent = `Signed in as ${user.displayName || user.email}`;
    googleBtn.style.display = 'none';
    microsoftBtn.style.display = 'none';
    signOutBtn.style.display = 'inline-block';
  } else {
    userStatusEl.textContent = 'Not signed in';
    googleBtn.style.display = 'inline-block';
    microsoftBtn.style.display = 'inline-block';
    signOutBtn.style.display = 'none';
  }
});
