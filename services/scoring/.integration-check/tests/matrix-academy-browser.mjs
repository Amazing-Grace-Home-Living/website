import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const port = 4185;
const server = spawn(process.execPath, ['scripts/serve.mjs', 'dist'], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: String(port) } });
let browser;
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(Error(`Server exited ${code}`))); });
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 1000 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('response', response => { if (response.status() >= 400 && new URL(response.url()).port === String(port)) errors.push(`${response.status()} ${response.url()}`); });
  // Exercise a real offline/CDN failure, not a stubbed icon API.
  await page.route('https://**/*', route => route.abort());
  await page.addInitScript(() => { let seed = 123456; Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296); });
  const visit = path => page.goto(`http://127.0.0.1:${port}${path}`);
  await visit('/arcade/matrix_of_consciousness_match_3_game.html');
  await page.waitForSelector('.gem-cell');
  assert.equal(await page.locator('.gem-cell').count(), 49);
  assert.equal(await page.locator('#quiz-modal').isVisible(), false);
  assert.equal(await page.evaluate(() => particleFramePending), false);
  await page.evaluate(() => { window.firstGemForTest = document.querySelector('.gem-cell'); });
  await page.locator('.gem-cell').first().focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('.selected').count(), 1);
  assert.equal(await page.evaluate(() => window.firstGemForTest === document.querySelector('.gem-cell')), true);
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator(':focus').getAttribute('data-col'), '1');
  assert.equal(await page.locator('.gem-cell[tabindex="0"]').count(), 1);
  await page.keyboard.press('Escape'); assert.equal(await page.locator('.selected').count(), 0);
  await page.locator('#btn-choice-systembreak').click();
  assert.equal(await page.locator('#btn-choice-architect').isDisabled(), true);
  await page.locator('#btn-reset').click();
  await page.locator('#btn-hint').click();
  assert.equal(await page.locator('.hinted').count(), 2);
  assert.equal(await page.locator('#moves-val').textContent(), '20');

  async function hintedSwap() {
    await page.locator('#btn-hint').click();
    const pair = await page.locator('.hinted').evaluateAll(cells => cells.map(cell => ({ r: cell.dataset.row, c: cell.dataset.col })));
    for (const cell of pair) await page.locator(`[data-row="${cell.r}"][data-col="${cell.c}"]`).click();
  }
  await hintedSwap();
  assert.equal(await page.locator('.gem-cell:disabled').count(), 49);
  await page.locator('#btn-reset').click();
  await page.waitForTimeout(550);
  assert.equal(await page.locator('#score-val').textContent(), '00000');
  assert.equal(await page.locator('#moves-val').textContent(), '20');
  console.log('PASS CDN-independent startup, stable DOM selection, keyboard controls, decisions, hints, cascade lock, and restart cancellation');

  // A nearly completed board fixture keeps the browser check fast; final score comes from a real swap.
  async function finishMissionBoard() {
    await page.evaluate(() => {
      const level = CAMPAIGN[player.currentCampaignLevel];
      score = level.targetScore - 20; matchesThisLevel = level.targetMatches || 0;
      starsThisLevel = level.targetStars || 0; bestComboThisLevel = level.targetCombo || 0;
      updateStats();
    });
    await hintedSwap();
    await page.waitForSelector('#quiz-modal:not(.hidden)');
    assert.equal(await page.locator('.gem-cell:disabled').count(), 49);
  }
  await finishMissionBoard();
  await page.locator('.quiz-choice-btn[data-index="0"]').click(); await page.locator('#quiz-submit-btn').click();
  assert.equal(await page.locator('#quiz-submit-btn').textContent(), 'TRY AGAIN');
  assert.equal(await page.evaluate(() => player.currentCampaignLevel), 0);
  await page.locator('#quiz-submit-btn').click();
  await page.locator('.quiz-choice-btn[data-index="1"]').click(); await page.locator('#quiz-submit-btn').click();
  assert.equal(await page.evaluate(() => player.xp), 25);
  // Reload after a correct response, redo the board, and confirm no duplicate question XP.
  await page.reload(); await page.waitForSelector('.gem-cell'); await finishMissionBoard();
  await page.locator('.quiz-choice-btn[data-index="1"]').click(); await page.locator('#quiz-submit-btn').click();
  assert.equal(await page.evaluate(() => player.xp), 25);
  await page.locator('#quiz-submit-btn').click();
  assert.equal(await page.evaluate(() => player.xp), 75);
  assert.equal(await page.evaluate(() => player.currentCampaignLevel), 1);
  await page.locator('#btn-next-mission').click();
  assert.equal(await page.evaluate(() => missionState), 'playing');
  console.log('PASS all board objectives, wrong-answer retry, no quiz reward farming, mission reward and progression');
  for (let index = 1; index < 4; index++) {
    await finishMissionBoard();
    const answers = await page.evaluate(() => CAMPAIGN[player.currentCampaignLevel].quiz.map(q => q.correct));
    for (const answer of answers) {
      await page.locator(`.quiz-choice-btn[data-index="${answer}"]`).click();
      await page.locator('#quiz-submit-btn').click(); await page.locator('#quiz-submit-btn').click();
    }
    if (index < 3) await page.locator('#btn-next-mission').click();
  }
  assert.equal(await page.evaluate(() => missionState), 'all-complete');
  assert.equal(await page.evaluate(() => player.xp), 800);
  await page.reload(); await page.waitForSelector('#modal-container:not(.hidden)');
  assert.equal(await page.evaluate(() => player.currentCampaignLevel), 4);
  assert.equal(await page.evaluate(() => player.xp), 800);
  await page.locator('#modal-close-btn').click(); await page.waitForURL('**/arcade/');
  await visit('/lms/'); await page.waitForSelector('#matrix-status');
  assert.match(await page.locator('#matrix-status').textContent(), /Milestone complete/);
  assert.equal(await page.locator('#xp').textContent(), '200');
  assert.match(await page.locator('#badges').textContent(), /Earth Academy guardian/);
  console.log('PASS four Academy missions, saved completion without replay farming, and shared LMS milestone');

  await page.evaluate(() => localStorage.removeItem('graceNexusProgress'));
  await visit('/arcade/matrix_of_consciousness_match_3_game.html'); await page.waitForSelector('.gem-cell');
  await page.evaluate(() => { for (let i = 0; i < 200; i++) addLog('Log retention check'); });
  assert.equal(await page.locator('#log-output>div').count(), 100);
  await page.evaluate(() => createExplosion(0, 0, 'heart'));
  await page.waitForFunction(() => particles.length === 0 && !particleFramePending);
  await page.evaluate(() => { document.getElementById('log-output').replaceChildren(); addLog('New Academy session. Hints are free; completed missions save locally.'); });
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/matrix-academy-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'artifacts/matrix-academy-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS bounded logs, idle particle shutdown, and mobile layout; no page errors');

  // Keep optional CDNs pending: the board must still start before they settle.
  const slow = await browser.newContext(), pendingRoutes = [];
  await slow.route('https://**/*', route => { pendingRoutes.push(route); });
  const p = await slow.newPage();
  await p.goto(`http://127.0.0.1:${port}/arcade/matrix_of_consciousness_match_3_game.html`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.gem-cell');
  assert.equal(await p.locator('.gem-cell').count(), 49);
  await p.locator('#btn-hint').click(); assert.equal(await p.locator('.hinted').count(), 2);
  await Promise.all(pendingRoutes.map(route => route.abort())); await slow.close();
  console.log('PASS playable startup while optional CDNs remain pending');
} finally { await browser?.close(); server.kill(); }
