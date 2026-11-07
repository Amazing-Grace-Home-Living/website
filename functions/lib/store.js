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
exports.purchaseStorage = exports.purchaseVIP = exports.purchasePoints = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
/**
 * Purchase points with real money (simulated). 1$ = 100 points.
 * Expected body: { uid: string, dollars: number }
 */
exports.purchasePoints = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const { uid, dollars } = req.body;
    if (!uid || typeof dollars !== 'number' || dollars <= 0) {
        res.status(400).json({ error: 'Invalid uid or dollars' });
        return;
    }
    const points = Math.round(dollars * 100);
    const userRef = db.collection('users').doc(uid);
    await db.runTransaction(async (t) => {
        const snap = await t.get(userRef);
        const current = snap.data()?.points ?? 0;
        t.set(userRef, { points: current + points }, { merge: true });
    });
    logger.info('Purchased points with money', { uid, dollars, points });
    res.json({ success: true, uid, dollars, pointsAdded: points });
});
/**
 * Purchase a VIP tier (monthly or annual).
 * Expected body: { uid: string, tier: 'vip_monthly' | 'vip_annual' }
 */
exports.purchaseVIP = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const { uid, tier } = req.body;
    if (!uid || (tier !== 'vip_monthly' && tier !== 'vip_annual')) {
        res.status(400).json({ error: 'Invalid uid or tier' });
        return;
    }
    const accessLevel = tier; // store raw string for simplicity
    const userRef = db.collection('users').doc(uid);
    await userRef.set({ accessLevel, vipStart: new Date() }, { merge: true });
    logger.info('VIP purchase', { uid, tier });
    res.json({ success: true, uid, tier });
});
/**
 * Purchase additional storage using points.
 * Expected body: { uid: string, size: number, cost: number }
 * size in MB, cost in points.
 */
exports.purchaseStorage = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const { uid, size, cost } = req.body;
    if (!uid || typeof size !== 'number' || typeof cost !== 'number') {
        res.status(400).json({ error: 'Invalid request body' });
        return;
    }
    const userRef = db.collection('users').doc(uid);
    await db.runTransaction(async (t) => {
        const snap = await t.get(userRef);
        const data = snap.data() ?? {};
        const currentStorage = data.storageQuotaMb ?? 0;
        const currentPoints = data.points ?? 0;
        if (currentPoints < cost) {
            throw new Error('Insufficient points for storage purchase');
        }
        t.set(userRef, {
            storageQuotaMb: currentStorage + size,
            points: currentPoints - cost
        }, { merge: true });
    }).catch(err => {
        logger.error('Storage purchase error', err);
        res.status(400).json({ error: err.message });
        return;
    });
    logger.info('Storage purchased', { uid, size, cost });
    res.json({ success: true, uid, size, cost });
});
