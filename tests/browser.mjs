import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const server = spawn(process.execPath, ['scripts/serve.mjs', 'dist'], { stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(new Error(`Server exited ${code}`))); });
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.addInitScript(() => { let seed = 123456; Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296); });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto('http://127.0.0.1:4173');
  await page.waitForFunction(() => document.querySelectorAll('.tile').length === 49);
  await page.locator('#hint').click();
  assert.equal(await page.locator('.hinted').count(), 2);
  const indices = await page.locator('.hinted').evaluateAll(tiles => tiles.map(t => t.dataset.index));
  await page.locator(`[data-index="${indices[0]}"]`).click();
  await page.locator(`[data-index="${indices[1]}"]`).click();
  await page.waitForFunction(() => !document.querySelector('#hint').disabled && Number(document.querySelector('#score').textContent.replaceAll(',', '')) > 0);
  assert.equal(await page.locator('#moves').textContent(), '19');
  const saved = await page.evaluate(() => localStorage.getItem('amazing-grace-matchmaker-v1'));
  await page.reload(); await page.waitForSelector('.tile');
  assert.equal(await page.evaluate(() => localStorage.getItem('amazing-grace-matchmaker-v1')), saved);
  const invalid = await page.evaluate(async () => {
    const { canSwap, applySwap, findMatches } = await import('/src/game/engine/matchmaker.js');
    const s = JSON.parse(localStorage.getItem('amazing-grace-matchmaker-v1'));
    for (let r = 0; r < 7; r++) for (let c = 0; c < 6; c++) if (canSwap(s.grid, r, c, r, c + 1) && !findMatches(applySwap(s.grid, r, c, r, c + 1)).matches.length) return [r * 7 + c, r * 7 + c + 1];
  });
  await page.locator(`[data-index="${invalid[0]}"]`).click(); await page.locator(`[data-index="${invalid[1]}"]`).click();
  assert.match(await page.locator('#message').textContent(), /no move used/);
  assert.equal(await page.locator('#moves').textContent(), '19');
  await page.locator('[data-index="0"]').focus(); await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.index), '1');
  // Seed a valid nearly-complete save, then finish through real user input.
  await page.evaluate(() => { const k = 'amazing-grace-matchmaker-v1', s = JSON.parse(localStorage.getItem(k)); s.score = 950; s.total = 950; localStorage.setItem(k, JSON.stringify(s)); });
  await page.reload(); await page.locator('#hint').click();
  const winning = await page.locator('.hinted').evaluateAll(tiles => tiles.map(t => t.dataset.index));
  await page.locator(`[data-index="${winning[0]}"]`).click(); await page.locator(`[data-index="${winning[1]}"]`).click();
  await page.waitForSelector('#next:not([hidden])'); await page.locator('#next').click();
  assert.match(await page.locator('#level-title').textContent(), /Level 2/); assert.equal(await page.locator('#score').textContent(), '0');
  await mkdir('artifacts', { recursive: true }); await page.screenshot({ path: 'artifacts/desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.ok((await page.locator('.tile').first().boundingBox()).width >= 35);
  await page.screenshot({ path: 'artifacts/mobile.png', fullPage: true });
  // Exhaustion, restart, and final-level completion.
  await page.evaluate(() => { const k = 'amazing-grace-matchmaker-v1', s = JSON.parse(localStorage.getItem(k)); s.moves = 1; s.score = 0; s.total = 0; s.status = 'playing'; localStorage.setItem(k, JSON.stringify(s)); });
  await page.reload(); await page.locator('#hint').click();
  let pair = await page.locator('.hinted').evaluateAll(t => t.map(x => x.dataset.index));
  // Exercise swipe input with a real pointer gesture.
  const firstBox = await page.locator(`[data-index="${pair[0]}"]`).boundingBox();
  const secondBox = await page.locator(`[data-index="${pair[1]}"]`).boundingBox();
  await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
  await page.mouse.down(); await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2); await page.mouse.up();
  await page.waitForFunction(() => document.querySelector('#moves').textContent === '0' && !document.querySelector('#restart').disabled);
  assert.match(await page.locator('#message').textContent(), /Out of moves|Level complete/);
  await page.locator('#restart').click(); assert.equal(await page.locator('#moves').textContent(), '22');
  await page.evaluate(() => { const k = 'amazing-grace-matchmaker-v1', s = JSON.parse(localStorage.getItem(k)); s.level = 5; s.moves = 28; s.score = 4950; s.total = 4950; s.status = 'playing'; localStorage.setItem(k, JSON.stringify(s)); });
  await page.reload(); await page.locator('#hint').click();
  pair = await page.locator('.hinted').evaluateAll(t => t.map(x => x.dataset.index));
  await page.locator(`[data-index="${pair[0]}"]`).click(); await page.locator(`[data-index="${pair[1]}"]`).click();
  await page.waitForFunction(() => document.querySelector('#message').textContent.includes('All five levels complete'));
  assert.match(await page.locator('#badges').textContent(), /Seven Stars champion · earned/);
  // Restore a known dead board and verify automatic recovery without a penalty.
  await page.evaluate(async () => {
    const { newGame } = await import('/src/game/progress.js');
    const { findLegalMoves } = await import('/src/game/engine/matchmaker.js');
    const s = newGame(); const kinds = ['heart', 'star', 'cross', 'flame', 'drop'];
    s.grid = Array.from({ length: 7 }, (_, r) => Array.from({ length: 7 }, (_, c) => ({ type: kinds[(r+c)%5], kind: kinds[(r+c)%5], special: null, createdBy: null })));
    if (findLegalMoves(s.grid).length) throw new Error('Fixture must be a dead board');
    localStorage.setItem('amazing-grace-matchmaker-v1', JSON.stringify(s));
  });
  await page.reload(); await page.waitForSelector('.tile');
  assert.match(await page.locator('#message').textContent(), /No moves remained/);
  assert.equal(await page.locator('#moves').textContent(), '20');
  await page.locator('#hint').click(); assert.equal(await page.locator('.hinted').count(), 2);
  // Corrupt saves must not prevent booting.
  await page.evaluate(() => localStorage.setItem('amazing-grace-matchmaker-v1', '{broken'));
  await page.reload(); await page.waitForSelector('.tile'); assert.equal(await page.locator('#moves').textContent(), '20');
  await page.goto('http://127.0.0.1:4173/src/game/star-matrix/index.html');
  await page.waitForSelector('.star-cell');
  assert.equal(await page.locator('.star-cell').count(), 49);
  await page.locator('#reset-btn').click();
  assert.equal(await page.locator('#score').textContent(), '0');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.goto('http://127.0.0.1:4173/stories/');
  assert.equal(await page.locator('main li').count(), 2);
  for (const href of await page.locator('main li a').evaluateAll(a => a.map(x => x.href))) {
    await page.goto(href); assert.equal(await page.locator('article section').count(), 6);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await page.goto('http://127.0.0.1:4173/audio-library/');
  assert.equal(await page.locator('audio').count(), 6);
  assert.equal(await page.locator('a[download]').count(), 20);
  for (const href of await page.locator('a[download]').evaluateAll(a => a.map(x => x.href))) {
    const response = await page.request.get(href); assert.equal(response.status(), 200);
    assert.ok(response.headers()['content-type'].startsWith('audio/'));
  }
  const downloadReady = page.waitForEvent('download');
  await page.locator('a[download]').first().click(); const download = await downloadReady;
  assert.match(download.suggestedFilename(), /\.mp3$/); await download.cancel();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log('Browser checks passed: render, hint, swap, cascade, invalid swap, save/reload, keyboard, level progression, mobile layout, swipes, restart, campaign completion, dead-board recovery, corrupt-save recovery; no console/network errors.');
} catch (error) { if (browser) { for (const context of browser.contexts()) for (const page of context.pages()) console.error(await page.locator('body').innerText()); } throw error; } finally { await browser?.close(); server.kill(); }
