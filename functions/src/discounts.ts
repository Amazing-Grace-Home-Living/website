import * as functions from 'firebase-functions';
import { logger } from 'firebase-functions/logger';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

initializeApp();
const db = getFirestore();

/**
 * Monthly leaderboard discounts – runs daily at 00:00 UTC.
 * On the last day of the month it writes tiered discounts (70%, 50%, 25%, 10%)
 * for the top 10 scores of the previous month.
 */
export const monthlyLeaderboardDiscounts = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const now = Timestamp.now();
    const today = now.toDate();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    if (today.getDate() !== lastDay) return null; // only run on final day

    logger.info('Running monthly leaderboard discount calculation');
    const startPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endPrevMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const scoresSnap = await db
      .collection('scores')
      .where('timestamp', '>=', Timestamp.fromDate(startPrevMonth))
      .where('timestamp', '<', Timestamp.fromDate(endPrevMonth))
      .orderBy('score', 'desc')
      .limit(10)
      .get();

    const discountMap = new Map<number, number>([
      [1, 70], [2, 50], [3, 50], [4, 25], [5, 25], [6, 10], [7, 10], [8, 10], [9, 10], [10, 10],
    ]);
    const batch = db.batch();
    const startDate = Timestamp.fromDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    const endDate = Timestamp.fromDate(new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()));
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
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      rank++;
    });
    await batch.commit();
    logger.info('Monthly discounts written', { count: rank - 1 });
    return null;
  });

/**
 * Yearly discounts – runs on Jan 1st (UTC) for the prior calendar year.
 * Awards 80 % discounts to:
 *   • Highest score of the previous year
 *   • Highest donation ever
 *   • Highest donation of the previous month
 */
export const yearlyDiscounts = functions.pubsub
  .schedule('0 0 1 1 *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const now = Timestamp.now();
    const today = now.toDate();
    const lastYear = today.getFullYear() - 1;
    const startYear = new Date(lastYear, 0, 1);
    const endYear = new Date(lastYear + 1, 0, 1);

    logger.info('Running yearly discount calculation');

    const topScoreSnap = await db
      .collection('scores')
      .where('timestamp', '>=', Timestamp.fromDate(startYear))
      .where('timestamp', '<', Timestamp.fromDate(endYear))
      .orderBy('score', 'desc')
      .limit(1)
      .get();
    const topDonationAllSnap = await db.collection('donations').orderBy('amount', 'desc').limit(1).get();
    const startPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endPrevMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const topDonationMonthSnap = await db
      .collection('donations')
      .where('timestamp', '>=', Timestamp.fromDate(startPrevMonth))
      .where('timestamp', '<', Timestamp.fromDate(endPrevMonth))
      .orderBy('amount', 'desc')
      .limit(1)
      .get();

    const batch = db.batch();
    const startDate = Timestamp.fromDate(new Date(today.getFullYear(), today.getMonth() + 1, 1));
    const endDate = Timestamp.fromDate(new Date(today.getFullYear(), today.getMonth() + 2, 1));
    const applyDiscount = (uid: string, description: string) => {
      const ref = db.collection('discounts').doc();
      batch.set(ref, {
        uid,
        discountPercent: 80,
        startDate,
        endDate,
        type: 'yearlyDiscount',
        description,
        createdAt: FieldValue.serverTimestamp(),
      });
    };
    if (!topScoreSnap.empty) applyDiscount(topScoreSnap.docs[0].data().uid, 'highestScoreOfYear');
    if (!topDonationAllSnap.empty) applyDiscount(topDonationAllSnap.docs[0].data().uid, 'highestDonationAllTime');
    if (!topDonationMonthSnap.empty) applyDiscount(topDonationMonthSnap.docs[0].data().uid, 'highestDonationOfMonth');

    await batch.commit();
    logger.info('Yearly discounts written');
    return null;
  });
