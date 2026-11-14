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
exports.onDonationCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_2 = require("firebase-admin/firestore");
const db = (0, firestore_2.getFirestore)();
/**
 * Trigger when a donation document is created.
 * Expected fields: uid (string), amount (number) – amount in USD.
 * Grants 100 points per dollar to the donating user.
 */
exports.onDonationCreated = (0, firestore_1.onDocumentCreated)({ document: 'donations/{donationId}', region: 'us-central1' }, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const { uid, amount } = data;
    if (!uid || typeof amount !== 'number' || amount <= 0) {
        logger.warn('Invalid donation payload', { uid, amount });
        return;
    }
    const points = Math.floor(amount * 100);
    const userRef = db.collection('users').doc(uid);
    await db.runTransaction(async (t) => {
        const snap = await t.get(userRef);
        const current = snap.data()?.points ?? 0;
        t.set(userRef, { points: current + points }, { merge: true });
    });
    logger.info('Granted donation points', { uid, amount, points });
});
