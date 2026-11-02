import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const port = 4183;
const server = spawn(process.execPath, ['scripts/serve.mjs', process.env.SITE_ROOT || 'dist'], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: String(port) } });
let browser;
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(Error(`Server exited ${code}`))); });
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.addInitScript(() => { let seed = 123456; Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296); });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && new URL(r.url()).port === String(port)) errors.push(`${r.status()} ${r.url()}`); });
  const visit = path => page.goto(`http://127.0.0.1:${port}${path}`);
  async function state() {
    return page.evaluate(async () => { const { app } = await import('/src/game/vim-defense/ui.js'); const g = app.game; return { phase: g.phase, wave: g.wave, x: g.player.x, y: g.player.y, stock: g.stock, score: g.score, time: g.time, keys: [...g.keys], mouse: g.mouseFiring, shots: g.shots.map(s => ({ source: s.source, vx: s.vx, vy: s.vy })) }; });
  }
  await visit('/lms/');
  assert.equal(await page.locator('a[href="/arcade/powershell-defense/"]').count(), 1);
  await page.locator('a[href="/arcade/vim-defense/"]').click();
  await page.evaluate(async () => { window.defenseForTest = (await import('/src/game/vim-defense/ui.js')).app; });
  await page.locator('#arena').focus(); await page.keyboard.press('i');
  assert.equal((await state()).phase, 'running');
  const before = await state();
  await page.keyboard.down('h');
  await page.waitForFunction(x => window.defenseForTest.game.player.x < x, before.x);
  await page.keyboard.up('h');
  const moved = await state();
  assert.ok(moved.x < before.x, `before ${JSON.stringify(before)} after ${JSON.stringify(moved)}`);
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(100); await page.keyboard.up('ArrowRight');
  await page.keyboard.press('h');
  const box = await page.locator('#arena').boundingBox();
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.25);
  await page.keyboard.down(' '); await page.mouse.down(); await page.waitForTimeout(100);
  const shots = (await state()).shots;
  assert.ok(shots.some(s => s.source === 'primary' && s.vx < 0));
  assert.ok(shots.some(s => s.source === 'mouse' && s.vx > 0));
  await page.mouse.up(); await page.keyboard.up(' ');
  await page.keyboard.press('a'); assert.equal(await page.locator('#target-assist').getAttribute('aria-pressed'), 'true');
  const charges = (await state()).stock; await page.keyboard.press('d'); assert.equal((await state()).stock, charges - 1);
  // Right-click must work alone and in either order with left-click firing.
  await page.evaluate(() => { window.defenseForTest.game.stock = 8; window.defenseForTest.game.drones = []; });
  await page.mouse.click(box.x + 50, box.y + 50, { button: 'right' });
  assert.equal((await state()).stock, 7);
  await page.mouse.down();
  await page.mouse.down({ button: 'right' });
  assert.equal((await state()).stock, 6);
  assert.equal((await state()).mouse, true);
  await page.mouse.up();
  assert.equal((await state()).mouse, false);
  await page.mouse.up({ button: 'right' });
  await page.mouse.down({ button: 'right' });
  await page.mouse.down();
  assert.equal((await state()).stock, 5);
  assert.equal((await state()).mouse, true);
  await page.mouse.up({ button: 'right' });
  assert.equal((await state()).mouse, true);
  await page.mouse.up();
  assert.equal((await state()).mouse, false);
  await page.evaluate(() => { window.defenseForTest.game.drones = []; });
  await page.keyboard.press('Escape'); const paused = await state();
  await page.waitForTimeout(120); assert.equal((await state()).time, paused.time);
  await page.waitForFunction(() => window.defenseForTest.frameId === null);
  await page.evaluate(async () => {
    const { app } = await import('/src/game/vim-defense/ui.js');
    app.originalDrawForTest = app.draw; app.idleDrawCountForTest = 0;
    app.draw = function() { this.idleDrawCountForTest++; return this.originalDrawForTest(); };
  });
  await page.waitForTimeout(160);
  assert.equal(await page.evaluate(async () => (await import('/src/game/vim-defense/ui.js')).app.idleDrawCountForTest), 0);
  await page.evaluate(async () => { const { app } = await import('/src/game/vim-defense/ui.js'); app.draw = app.originalDrawForTest; });
  assert.equal(paused.phase, 'paused'); assert.deepEqual(paused.keys, []); assert.equal(paused.mouse, false);
  await page.keyboard.press('Enter'); assert.equal((await state()).phase, 'running');
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); assert.equal((await state()).phase, 'paused');
  await page.locator('#arena').focus(); await page.keyboard.press('i');
  console.log('PASS actual Vim/arrow movement, Space + mouse crossfire, d drones, i/Enter select, Escape and focus-loss pause');

  async function playWave() {
    return page.evaluate(async () => {
      const { app } = await import('/src/game/vim-defense/ui.js'); const g = app.game;
      g.releaseInputs(); let steps = 0;
      while (g.phase === 'running' && steps++ < 30000) {
        if (g.stock > 0 && g.drones.length < 2) g.deploy();
        const target = g.enemies.reduce((best, e) => !best || Math.hypot(e.x - 400, e.y - 240) < Math.hypot(best.x - 400, best.y - 240) ? e : best, null);
        if (target) { g.aim = { x: target.x, y: target.y }; g.mouseFiring = true; }
        g.tick(1 / 60);
      }
      app.sync(true);
      return { phase: g.phase, wave: g.wave, core: g.core, hull: g.player.hp, steps };
    });
  }
  let result = await playWave(); assert.equal(result.phase, 'quiz', JSON.stringify(result));
  const stock = (await state()).stock;
  // i on the heading selects a menu control; j/l navigate, and Enter activates it.
  await page.keyboard.press('i');
  assert.equal(await page.locator(':focus').getAttribute('data-answer'), '0');
  await page.keyboard.press('j'); assert.equal(await page.locator(':focus').getAttribute('data-answer'), '1');
  await page.keyboard.press('h');
  const firstQuestion = await page.evaluate(async () => (await import('/src/game/vim-defense/ui.js')).app.game.currentQuestion());
  await page.locator(`[data-answer="${firstQuestion.answer}"]`).focus(); await page.keyboard.press('Enter');
  assert.equal((await state()).stock, stock + 1);
  const plan = await page.evaluate(async () => JSON.stringify((await import('/src/game/vim-defense/ui.js')).app.game.quizPlan));
  await page.reload(); await page.waitForSelector('#quiz-next');
  assert.equal((await state()).stock, stock + 1);
  assert.equal(await page.evaluate(async () => JSON.stringify((await import('/src/game/vim-defense/ui.js')).app.game.quizPlan)), plan);
  assert.equal(await page.locator('#target-assist').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.evaluate(async id => (await import('/src/game/vim-defense/ui.js')).app.record.review[id].attempts, firstQuestion.id), 1);
  assert.equal(await page.locator('.quiz-answers button:disabled').count(), 3);
  await page.locator('#quiz-next').focus(); await page.keyboard.press('i');
  const secondQuestion = await page.evaluate(async () => (await import('/src/game/vim-defense/ui.js')).app.game.currentQuestion());
  await page.locator(`[data-answer="${(secondQuestion.answer + 1) % 3}"]`).click();
  assert.match(await page.locator('.quiz-feedback').textContent(), /no bonus charge/);
  const afterWrong = (await state()).stock;
  await page.locator('#quiz-next').click();
  assert.equal((await state()).phase, 'intermission');
  await page.locator('#study-deck>summary').click(); await page.selectOption('#study-filter', 'missed');
  assert.equal(await page.locator('.study-card').count(), 1);
  assert.equal(await page.locator('.study-card').getAttribute('data-question'), secondQuestion.id);
  await page.locator('.study-card>summary').click(); assert.match(await page.locator('.study-card').textContent(), /Answer:/);
  assert.equal((await state()).stock, afterWrong);
  await page.locator('#study-deck>summary').click();
  await page.locator('#briefing-content button').click();
  assert.equal((await state()).stock, afterWrong + 1);
  console.log('PASS Bash menu navigation, quiz reward, checkpoint reload without reward farming, wrong-answer feedback and standard refit');
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/vim-defense-desktop.png', fullPage: true });
  for (let wave = 2; wave <= 5; wave++) {
    result = await playWave();
    assert.equal(result.phase, wave === 5 ? 'won' : 'quiz', JSON.stringify(result));
    if (wave < 5) {
      // A correct answer followed by skip keeps its reward and the baseline refit.
      const question = await page.evaluate(async () => (await import('/src/game/vim-defense/ui.js')).app.game.currentQuestion());
      await page.locator(`[data-answer="${question.answer}"]`).click();
      const prior = (await state()).stock;
      await page.locator('#skip-quiz').click();
      assert.equal((await state()).stock, Math.min(8, prior + 1));
    }
  }
  assert.match(await page.locator('#briefing-title').textContent(), /Core secured/);
  await visit('/lms/'); await page.waitForSelector('#vim-defense-status');
  assert.match(await page.locator('#vim-defense-status').textContent(), /milestone complete/);
  assert.equal(await page.locator('#xp').textContent(), '100');
  assert.match(await page.locator('#badges').textContent(), /Home row defender/);
  await visit('/arcade/vim-defense/');
  await page.selectOption('#game-mode', 'vim');
  await page.locator('#arena').focus(); await page.keyboard.press('Enter');
  result = await playWave(); assert.equal(result.phase, 'intermission');
  assert.equal(await page.locator('.quiz-answers').count(), 0);
  await page.locator('#briefing-content button').click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'artifacts/vim-defense-mobile.png', fullPage: true });
  await page.locator('#study-deck>summary').click();
  await page.waitForFunction(() => document.getElementById('pause').textContent.includes('Resume'));
  await page.selectOption('#study-filter', 'all'); assert.equal(await page.locator('.study-card').count(), 24);
  await page.screenshot({ path: 'artifacts/vim-defense-review-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 750 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);

  const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await touch.newPage(); const touchErrors = []; p.on('pageerror', e => touchErrors.push(e.message));
  await p.goto(`http://127.0.0.1:${port}/arcade/vim-defense/`); await p.locator('#start-wave').click();
  // Use real touch events for aimed fire, then two simultaneous touch controls.
  const arenaBox = await p.locator('#arena').boundingBox(); await p.touchscreen.tap(arenaBox.x + 50, arenaBox.y + 40);
  await p.locator('#touch-bar [data-action="left"]').scrollIntoViewIfNeeded();
  const left = await p.locator('#touch-bar [data-action="left"]').boundingBox(), fire = await p.locator('#touch-bar .fire-button').boundingBox();
  const initialX = await p.evaluate(async () => (await import('/src/game/vim-defense/ui.js')).app.game.player.x);
  const cdp = await touch.newCDPSession(p);
  const finger = (box, id) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2, id });
  const held = () => p.evaluate(async () => [...(await import('/src/game/vim-defense/ui.js')).app.game.keys]);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger(left, 1), finger(fire, 2)] });
  assert.deepEqual((await held()).sort(), [' ', 'h']);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [finger(fire, 1), finger(fire, 2)] });
  assert.deepEqual(await held(), [' ']);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [finger(fire, 1)] });
  assert.deepEqual(await held(), [' ']);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  assert.deepEqual(await held(), []);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: left.x + left.width / 2, y: left.y + left.height / 2, id: 1 }] });
  await p.waitForTimeout(140);
  const movedX = await p.evaluate(async () => (await import('/src/game/vim-defense/ui.js')).app.game.player.x);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: fire.x + fire.width / 2, y: fire.y + fire.height / 2, id: 2 }] });
  await p.waitForTimeout(140);
  const shotCount = await p.evaluate(async () => (await import('/src/game/vim-defense/ui.js')).app.game.shots.length);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.ok(movedX < initialX); assert.ok(shotCount > 0);
  assert.deepEqual(touchErrors, []); await touch.close();
  const blocked = await browser.newContext();
  await blocked.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw Error('storage blocked'); } }));
  const b = await blocked.newPage(); const blockedErrors = []; b.on('pageerror', e => blockedErrors.push(e.message));
  await b.goto(`http://127.0.0.1:${port}/arcade/vim-defense/`); await b.locator('#start-wave').click();
  assert.match(await b.locator('#save-status').textContent(), /Saving unavailable/);
  assert.deepEqual(blockedErrors, []); await blocked.close();
  console.log('PASS five-wave combat, LMS milestone, VIM-only mode, mobile layouts, touch controls, stable quiz plans, review cards, target assist, idle rendering, unavailable storage; no page errors');
} finally { await browser?.close(); server.kill(); }
