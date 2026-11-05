import { onDocumentDeleted, FirestoreEvent } from 'firebase-functions/v2/firestore';
import { onUserCreated, AuthUserRecord } from 'firebase-functions/v2/identity';
import * as logger from 'firebase-functions/logger';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firestore (admin) - already initialized in index.ts, but safe to call again
// (initializeApp is idempotent, so no need to import)
const db = getFirestore();

// Firestore trigger: runs when a user document is deleted
export const onUserDeleted = onDocumentDeleted(
  { document: 'users/{userId}', region: 'us-central1' },
  async (event: FirestoreEvent<any>) => {
    const { userId } = event.params;
    logger.info(`User document deleted: ${userId}`);
    // Example cleanup: delete the corresponding profile document
    await db.collection('profiles').doc(userId).delete();
  }
);

// Auth trigger: runs when a new Auth user is created
export const onAuthUserCreate = onUserCreated(
  async (user: any) => {
    logger.info('Auth user created', { uid: user.uid, email: user.email });
    await db.collection('profiles').doc(user.uid).set({ createdAt: new Date() }, { merge: true });
  }
);
