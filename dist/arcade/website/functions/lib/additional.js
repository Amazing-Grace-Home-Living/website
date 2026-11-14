"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAuthUserCreate = exports.onUserDeleted = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const identity_1 = require("firebase-functions/v2/identity");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_2 = require("firebase-admin/firestore");
// Initialize Firestore (admin) - already initialized in index.ts, but safe to call again
// (initializeApp is idempotent, so no need to import)
const db = (0, firestore_2.getFirestore)();
// Firestore trigger: runs when a user document is deleted
exports.onUserDeleted = (0, firestore_1.onDocumentDeleted)({ document: 'users/{userId}', region: 'us-central1' }, async (event) => {
    const { userId } = event.params;
    logger.info(`User document deleted: ${userId}`);
    // Example cleanup: delete the corresponding profile document
    await db.collection('profiles').doc(userId).delete();
});
// Auth trigger: runs when a new Auth user is created
exports.onAuthUserCreate = (0, identity_1.onUserCreated)(async (user) => {
    logger.info('Auth user created', { uid: user.uid, email: user.email });
    await db.collection('profiles').doc(user.uid).set({ createdAt: new Date() }, { merge: true });
});
