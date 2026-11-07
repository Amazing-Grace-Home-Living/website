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
exports.yearlyDiscounts = exports.monthlyLeaderboardDiscounts = void 0;
const functions = __importStar(require("firebase-functions"));
const logger_1 = require("firebase-functions/logger");
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
/**
 * Monthly leaderboard discounts – runs daily at 00:00 UTC.
 * On the last day of the month it writes tiered discounts (70%, 50%, 25%, 10%)
 * for the top 10 scores of the previous month.
 */
exports.monthlyLeaderboardDiscounts = functions.pubsub
    .schedule('0 0 * * *')
    .timeZone('UTC')
    .onRun(async (context) => {
    const now = firestore_1.Timestamp.now();
    const today = now.toDate();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    if (today.getDate() !== lastDay)
        return null; // only run on final day
    logger_1.logger.info('Running monthly leaderboard discount calculation');
    const startPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endPrevMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const scoresSnap = await db
        .collection('scores')
        .where('timestamp', '>=', firestore_1.Timestamp.fromDate(startPrevMonth))
        .where('timestamp', '<', firestore_1.Timestamp.fromDate(endPrevMonth))
        .orderBy('score', 'desc')
        .limit(10)
        .get();
    const discountMap = new Map([
        [1, 70], [2, 50], [3, 50], [4, 25], [5, 25], [6, 10], [7, 10], [8, 10], [9, 10], [10, 10],
    ]);
    const batch = db.batch();
    const startDate = firestore_1.Timestamp.fromDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    const endDate = firestore_1.Timestamp.fromDate(new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()));
    let rank = 1;
    scoresSnap.forEach((doc) => {
        const data = doc.data();
        const uid = data.uid;
        const discount = discountMap.get(rank) ?? 0;
        if (discount > 0) {
            const ref = db.collection('discounts').doc();
            batch.set(ref, {
                uid,
                discountPercent: discount,
                startDate,
                endDate,
                type: 'monthlyLeaderboard',
                rank,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        rank++;
    });
    await batch.commit();
    logger_1.logger.info('Monthly discounts written', { count: rank - 1 });
    return null;
});
/**
 * Yearly discounts – runs on Jan 1st (UTC) for the prior calendar year.
 * Awards 80 % discounts to:
 *   • Highest score of the previous year
 *   • Highest donation ever
 *   • Highest donation of the previous month
 */
exports.yearlyDiscounts = functions.pubsub
    .schedule('0 0 1 1 *')
    .timeZone('UTC')
    .onRun(async (context) => {
    const now = firestore_1.Timestamp.now();
    const today = now.toDate();
    const lastYear = today.getFullYear() - 1;
    const startYear = new Date(lastYear, 0, 1);
    const endYear = new Date(lastYear + 1, 0, 1);
    logger_1.logger.info('Running yearly discount calculation');
    const topScoreSnap = await db
        .collection('scores')
        .where('timestamp', '>=', firestore_1.Timestamp.fromDate(startYear))
        .where('timestamp', '<', firestore_1.Timestamp.fromDate(endYear))
        .orderBy('score', 'desc')
        .limit(1)
        .get();
    const topDonationAllSnap = await db.collection('donations').orderBy('amount', 'desc').limit(1).get();
    const startPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endPrevMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const topDonationMonthSnap = await db
        .collection('donations')
        .where('timestamp', '>=', firestore_1.Timestamp.fromDate(startPrevMonth))
        .where('timestamp', '<', firestore_1.Timestamp.fromDate(endPrevMonth))
        .orderBy('amount', 'desc')
        .limit(1)
        .get();
    const batch = db.batch();
    const startDate = firestore_1.Timestamp.fromDate(new Date(today.getFullYear(), today.getMonth() + 1, 1));
    const endDate = firestore_1.Timestamp.fromDate(new Date(today.getFullYear(), today.getMonth() + 2, 1));
    const applyDiscount = (uid, description) => {
        const ref = db.collection('discounts').doc();
        batch.set(ref, {
            uid,
            discountPercent: 80,
            startDate,
            endDate,
            type: 'yearlyDiscount',
            description,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
    };
    if (!topScoreSnap.empty)
        applyDiscount(topScoreSnap.docs[0].data().uid, 'highestScoreOfYear');
    if (!topDonationAllSnap.empty)
        applyDiscount(topDonationAllSnap.docs[0].data().uid, 'highestDonationAllTime');
    if (!topDonationMonthSnap.empty)
        applyDiscount(topDonationMonthSnap.docs[0].data().uid, 'highestDonationOfMonth');
    await batch.commit();
    logger_1.logger.info('Yearly discounts written');
    return null;
});
