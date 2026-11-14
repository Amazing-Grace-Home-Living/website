import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { LESSONS } from '../src/game/learning/curriculum.js';
const server = spawn(process.execPath, ['scripts/serve.mjs', process.env.SITE_ROOT || 'dist'], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: '4176' } });
let browser;
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(Error(`Server exited ${code}`))); });
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 1000 } });
  await page.addInitScript(() => { let seed = 123456; Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296); });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && new URL(response.url()).origin === 'http://127.0.0.1:4176') errors.push(`${response.status()} ${response.url()}`); });
  const visit = path => page.goto(`http://127.0.0.1:4176${path}`);
  await visit('/arcade/');
  console.log('Arcade:', await page.title(), await page.locator('h1').textContent());
  await page.locator('a.primary[href="/lms/"]').first().click();
  await page.waitForSelector('[data-lesson="foundations"]');
  assert.equal(await page.locator('[data-lesson="tactics"]').isDisabled(), true);
  await visit('/src/game/tower-defense/index.html?stage=boss');
  await page.waitForFunction(() => document.getElementById('mission-status').textContent.includes('Locked'));
  assert.equal(await page.locator('#btn-wave').isDisabled(), true);

  async function quiz(id, fail = false) {
    await visit('/lms/'); await page.locator(`[data-lesson="${id}"]`).click();
    const lesson = LESSONS.find(l => l.id === id);
    for (const [i, q] of lesson.questions.entries()) await page.locator(`input[name="q${i}"][value="${fail ? (q.answer + 1) % 3 : q.answer}"]`).check();
    await page.locator('#submit-quiz').click();
    assert.match(await page.locator('#quiz-feedback').textContent(), fail ? /Keep learning/ : /Passed!/);
    console.log(`PASS ${id} quiz ${fail ? 'feedback and retry' : 'pass'}`);
  }
  await quiz('foundations', true);
  assert.equal(await page.locator('#xp').textContent(), '0');
  await quiz('foundations');
  assert.equal(await page.locator('#xp').textContent(), '50');
  assert.match(await page.locator('#mission-cards').first().textContent(), /Complete Code Matrix/);
  // Fixture a nearly completed puzzle, then earn the milestone through normal inputs.
  await visit('/arcade/code-matrix/');
  await page.waitForSelector('.tile');
  await page.evaluate(async () => {
    const key = 'amazing-grace-matchmaker-v1', state = JSON.parse(localStorage.getItem(key));
    const { LEVELS } = await import('/src/game/progress.js');
    state.score = LEVELS[state.level - 1].target - 50; state.total = state.score; localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload(); await page.locator('#hint').click();
  const pair = await page.locator('.hinted').evaluateAll(tiles => tiles.map(t => t.dataset.index));
  for (const index of pair) await page.locator(`[data-index="${index}"]`).click();
  await page.waitForSelector('#next:not([hidden])');
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('amazing-grace-signal-bonus-v1'))), { credits: 50, awards: ['code-matrix-level-1'] });
  await visit('/lms/');
  assert.equal(await page.locator('#xp').textContent(), '100');
  assert.match(await page.locator('#mission-cards').first().textContent(), /Unlocked/);

  async function defend(stage) {
    await visit(`/src/game/tower-defense/index.html?stage=${stage}`);
    await page.waitForFunction(() => document.getElementById('mission-status').textContent.includes('Mission ready'));
    if (stage === 'nexus') {
      assert.match(await page.locator('#mission-status').textContent(), /Signal bonus \+50 credits/);
      assert.equal(await page.locator('#credits').textContent(), '210');
      assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('amazing-grace-signal-bonus-v1'))).credits, 0);
    }
    // Capture the running instance via a test-only prototype wrapper, without changing production globals.
    await page.evaluate(async () => {
      const { TowerDefenseGame } = await import('/src/game/tower-defense/tower-defense-engine.js');
      const update = TowerDefenseGame.prototype.update;
      TowerDefenseGame.prototype.update = function(...args) { window.testGame = this; return update.apply(this, args); };
    });
    await page.waitForFunction(() => window.testGame);
    // Exercise accessible placement with actual keyboard input.
    await page.locator('#game-canvas').focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    await page.locator('#place-column').fill('4'); await page.locator('#place-row').fill('5');
    await page.locator('#btn-place').click();
    assert.match(await page.locator('#mission-status').textContent(), /placed at column 4, row 5/);
    if (stage === 'nexus') assert.equal(await page.locator('#credits').textContent(), '90');
    const result = await page.evaluate(() => {
      const g = window.testGame;
      // Choose affordable coverage, then simulate actual enemies, shots, damage, and rewards.
      function build() {
        g.selectedTowerKey = 'pulse';
        while (g.credits >= 60) {
          let best = null, bestValue = -1;
          for (let row = 0; row < 12; row++) for (let col = 0; col < 20; col++) {
            if (g.path.some(p => p.x === col && p.y === row) || g.towers.some(t => t.col === col && t.row === row)) continue;
            const value = g.path.reduce((sum, p) => {
              if (Math.hypot((p.x-col)*40, (p.y-row)*40) > 110) return sum;
              const covered = g.towers.filter(t => Math.hypot(p.x*40+20-t.x,p.y*40+20-t.y) <= t.range).length;
              return sum + 1 / (1 + covered);
            }, 0);
            if (value > bestValue) { bestValue = value; best = { col, row }; }
          }
          if (!best) break;
          g.placeTower(best.col, best.row);
        }
      }
      let frames = 0;
      while (g.status === 'ready' && frames < 100000) {
        if (!g.waveActive) { build(); g.startWave(); }
        g.update(); frames++;
      }
      return { status: g.status, health: g.health, wave: g.wave, frames, towers: g.towers.length };
    });
    assert.equal(result.status, 'won', `${stage}: ${JSON.stringify(result)}`);
    assert.equal(await page.locator('#mission-intermission').isVisible(), true);
    assert.equal(await page.locator('#mission-intermission a').count(), 7);
    console.log(`PASS ${stage}: ${result.wave} waves, ${result.health} core health remaining`);
    await page.locator('#btn-restart').click();
    assert.equal(await page.locator('#mission-intermission').isVisible(), false);
    assert.equal(await page.locator('#wave').textContent(), `1 / ${stage === 'nexus' ? 3 : stage === 'syndicate' ? 4 : 5}`);
  }
  await defend('nexus'); await quiz('tactics'); await defend('syndicate'); await quiz('adaptation'); await defend('boss');
  await visit('/lms/'); assert.equal(await page.locator('#mission-count').textContent(), '3 / 4');
  assert.equal(await page.locator('#xp').textContent(), '650');
  assert.match(await page.locator('#badges').textContent(), /Campaign champion/);
  await quiz('adaptation'); assert.equal(await page.locator('#xp').textContent(), '650');
  await page.locator('#close-lesson').click();
  await mkdir('artifacts', { recursive: true }); await page.screenshot({ path: 'artifacts/learning-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'artifacts/learning-mobile.png', fullPage: true });
  await visit('/src/game/tower-defense/index.html?stage=nexus');
  await page.waitForSelector('.tower-card');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'artifacts/defense-mobile.png', fullPage: true });
  // Optional quiz records an actual finished round, not individual correct answers.
  await visit('/arcade/bible-study/');
  await page.evaluate(() => startQuiz());
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => selectChoice(questions[currentIdx].correct));
    await page.locator('#next-btn').click();
  }
  await visit('/lms/'); assert.equal(await page.locator('#xp').textContent(), '700');
  await visit('/arcade/matrix_of_consciousness_match_3_game.html');
  assert.match(await page.locator('#moved-title').textContent(), /joined Code Matrix/);
  assert.equal(await page.locator('a[href="/arcade/code-matrix/"]').count(), 1);
  await visit('/lms/'); assert.equal(await page.locator('#xp').textContent(), '700');
  assert.deepEqual(errors, []);

  const blocked = await browser.newContext();
  await blocked.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw Error('storage blocked'); } }));
  const blockedPage = await blocked.newPage();
  await blockedPage.goto('http://127.0.0.1:4176/lms/');
  await blockedPage.waitForFunction(() => document.getElementById('save-note').textContent.includes('Saving is unavailable'));
  await blockedPage.goto('http://127.0.0.1:4176/src/game/tower-defense/index.html');
  await blockedPage.waitForFunction(() => document.getElementById('mission-status').textContent.includes('Locked'));
  await blocked.close();
  console.log('PASS full quiz → puzzle → three defense missions → badges flow, replay XP, locked deep links, mobile layout, blocked storage; no page errors');
} finally { await browser?.close(); server.kill(); }
