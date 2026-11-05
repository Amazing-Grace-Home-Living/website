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
exports.spendPoints = exports.grantPoints = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
/**
 * HTTP endpoint to grant points to a user.
 * Expects JSON body: { uid: string, amount: number }
 */
exports.grantPoints = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const { uid, amount } = req.body;
    if (!uid || typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({ error: 'Invalid uid or amount' });
        return;
    }
    const userRef = db.collection('users').doc(uid);
    await db.runTransaction(async (t) => {
        const snap = await t.get(userRef);
        const current = snap.data()?.points ?? 0;
        t.set(userRef, { points: current + amount }, { merge: true });
    });
    logger.info('Granted points', { uid, amount });
    res.json({ success: true, uid, added: amount });
});
/**
 * HTTP endpoint to spend points.
 * Expects JSON body: { uid: string, amount: number, description?: string }
 */
exports.spendPoints = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const { uid, amount, description } = req.body;
    if (!uid || typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({ error: 'Invalid uid or amount' });
        return;
    }
    const userRef = db.collection('users').doc(uid);
    await db.runTransaction(async (t) => {
        const snap = await t.get(userRef);
        const current = snap.data()?.points ?? 0;
        if (current < amount) {
            throw new Error('Insufficient points');
        }
        t.set(userRef, { points: current - amount }, { merge: true });
        // optional audit log
        const logRef = db.collection('pointTransactions').doc();
        t.set(logRef, { uid, amount: -amount, description: description ?? '', timestamp: new Date() });
    }).catch((e) => {
        logger.error('Spend points error', e);
        res.status(400).json({ error: e.message });
        return;
    });
    logger.info('Spent points', { uid, amount, description });
    res.json({ success: true, uid, spent: amount });
});
