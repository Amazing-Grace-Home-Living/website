// Firebase initialization and auth handlers for Amazing Grace
// Replace the placeholder config with your project's Firebase config.
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Firebase web config is public; restrict API usage and protect data with rules.
// App Check must be registered and configured for this web app before enforcement.
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Ensure session persistence
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch((e) => console.error('Persistence error', e));

const userStatusEl = document.getElementById('user-status');
const googleBtn = document.getElementById('googleBtn');
const microsoftBtn = document.getElementById('microsoftBtn');
const signOutBtn = document.getElementById('signOutBtn');

googleBtn?.addEventListener('click', async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await firebase.auth().signInWithPopup(provider);
  } catch (e) {
    console.error('Google sign‑in error', e);
  }
});

microsoftBtn?.addEventListener('click', async () => {
  const provider = new firebase.auth.OAuthProvider('microsoft.com');
  try {
    await firebase.auth().signInWithPopup(provider);
  } catch (e) {
    console.error('Microsoft sign‑in error', e);
  }
});

signOutBtn?.addEventListener('click', async () => {
  await firebase.auth().signOut();
});

auth.onAuthStateChanged((user) => {
  if (!userStatusEl || !googleBtn || !microsoftBtn || !signOutBtn) return;
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