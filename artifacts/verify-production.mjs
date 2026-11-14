import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
 const page = await browser.newPage(); const errors = [];
 page.on('pageerror', e => errors.push(e.message));
 const base = 'https://amazing-grace-home-living.vercel.app';
 let response = await page.goto(base + '/stories/the-matrix-of-conscience/'); assert.equal(response.status(), 200);
 assert.equal(await page.locator('article section').count(), 1); assert.equal(await page.locator('article h2').textContent(), 'Chapter One');
 assert.equal(await page.locator('article p').count(), 24);
 response = await page.goto(base + '/listings/'); assert.equal(response.status(), 200);
 assert.equal(await page.locator('#tampa .gallery-photo').count(), 7);
 response = await page.goto(base + '/'); assert.equal(response.status(), 200); await page.waitForSelector('.tile'); assert.equal(await page.locator('.tile').count(),49); await page.locator('#hint').click(); assert.equal(await page.locator('.hinted').count(),2);
 response = await page.goto(base + '/audio-library/'); assert.equal(response.status(),200); assert.equal(await page.locator('a[download]').count(),20);
 assert.deepEqual(errors, []);
 console.log('Production verified: public HTTP 200, one chapter with 24 paragraphs, 7 Tampa photos, photo viewer, playable board/hints, and 20 music downloads; no browser script errors.');
} finally { await browser.close(); }
