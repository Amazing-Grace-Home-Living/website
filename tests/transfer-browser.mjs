import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const port = 4186;
const server = spawn(process.execPath, ['scripts/serve.mjs', 'dist'], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: String(port) } });
let browser;
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(Error(`Server exited ${code}`))); });
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
  const source = await browser.newContext({ acceptDownloads: true }), p = await source.newPage();
  const errors = [], network = [];
  const monitor = page => {
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400 && new URL(r.url()).port === String(port)) errors.push(`${r.status()} ${r.url()}`); });
    page.on('request', r => { if (new URL(r.url()).port === String(port) && !['GET', 'HEAD'].includes(r.method())) network.push(`${r.method()} ${r.url()}`); });
  };
  const visit = (page, path) => page.goto(`http://127.0.0.1:${port}${path}`);
  monitor(p); await visit(p, '/lms/'); await p.waitForSelector('#next-step-action button');
  assert.match(await p.locator('#next-step-title').textContent(), /foundation/);
  await p.locator('#next-step-action button').click(); assert.equal(await p.locator('#lesson-panel').isVisible(), true);
  await p.locator('#close-lesson').click();
  await p.locator('#export-progress').click(); assert.match(await p.locator('#transfer-status').textContent(), /No saved learning checkpoints/);

  // Fixture real, validated game checkpoints rather than an invented XP total.
  await p.evaluate(async () => {
    const progression = await import('/src/game/learning/progression.js');
    const { LESSONS } = await import('/src/game/learning/curriculum.js');
    const { newGame, SAVE_KEY } = await import('/src/game/progress.js');
    const { newAdventure, finishQuest, RPG_KEY } = await import('/src/game/matrix-rpg/engine.js');
    const { QUESTS } = await import('/src/game/matrix-rpg/content.js');
    const { DefenseGame, SAVE_KEY: DEFENSE_KEY } = await import('/src/game/vim-defense/engine.js');
    const { newAcademy, gradeLesson, ACADEMY_KEY } = await import('/src/game/academy/state.js');
    const { PS_LESSONS } = await import('/src/game/academy/content.js');
    const shared = progression.recordQuiz(progression.emptyProgress(), 'foundations', LESSONS[0].questions.map(q => q.answer)).state;
    localStorage.setItem(progression.CAMPAIGN_KEY, JSON.stringify(shared));
    localStorage.setItem(SAVE_KEY, JSON.stringify(newGame(2, 1200, ['First light'])));
    let story = newAdventure('navigator');
    for (const q of QUESTS.slice(0, 4)) story = finishQuest(story, q.id, q.type === 'memory' ? { sequence: q.sequence } : q.type === 'choice' ? { choice: q.choices[0].id } : { answers: q.questions.map(item => item.answer) });
    localStorage.setItem(RPG_KEY, JSON.stringify(story));
    localStorage.setItem(DEFENSE_KEY, JSON.stringify({ version: 1, best: 1800, wins: 1, checkpoint: new DefenseGame().checkpoint(), review: { pwd: { attempts: 1, correct: 0, lastCorrect: false } }, assist: true }));
    localStorage.setItem(ACADEMY_KEY, JSON.stringify({ ...gradeLesson(newAcademy(), PS_LESSONS[0].id, PS_LESSONS[0].questions.map(q => q.answer)).state, player: 'Learner A' }));
    localStorage.setItem('graceNexusProgress', JSON.stringify({ version: 2, player: { currentCampaignLevel: 1, xp: 75, answeredQuestionIds: ['earth-1:0'] } }));
    localStorage.setItem('aghl_sevenStarsCompleted', JSON.stringify(['Ephesus', 'Smyrna', 'Pergamum', 'Thyatira', 'Sardis', 'Philadelphia', 'Laodicea']));
    localStorage.setItem('bridge-token', 'excluded-browser-test-sentinel');
  });
  await p.reload(); await p.waitForSelector('#next-step-action a');
  assert.match(await p.locator('#next-step-title').textContent(), /Nexus/);
  const downloadPromise = p.waitForEvent('download'); await p.locator('#export-progress').click();
  const download = await downloadPromise, text = await readFile(await download.path(), 'utf8'), backup = JSON.parse(text);
  assert.equal(Object.keys(backup.records).length, 7); assert.equal(text.includes('excluded-browser-test-sentinel'), false);
  console.log('PASS next-step action, empty export handling, and seven-record download without unrelated browser data');

  const target = await browser.newContext({ viewport: { width: 1366, height: 1000 } }), page = await target.newPage(); monitor(page);
  await visit(page, '/lms/'); await page.waitForSelector('#import-progress');
  const before = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage))));
  await page.locator('#import-progress').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
  assert.match(await page.locator('#transfer-status').textContent(), /not valid JSON/);
  assert.equal(await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage)))), before);
  const file = { name: '<img src=x onerror=alert(1)>.json', mimeType: 'application/json', buffer: Buffer.from(text) };
  await page.locator('#import-progress').setInputFiles(file); await page.waitForSelector('#restore-preview:not([hidden])');
  assert.equal(await page.locator('#restore-file img').count(), 0);
  assert.match(await page.locator('#restore-summary').textContent(), /425 campaign XP/);
  assert.equal(await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage)))), before);
  await page.locator('#cancel-restore').click(); assert.equal(await page.locator('#restore-preview').isVisible(), false);
  assert.equal(await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage)))), before);

  // Open active games before restoring, to exercise actual cross-tab storage events.
  const arena = await target.newPage(); monitor(arena); await visit(arena, '/arcade/vim-defense/'); await arena.locator('#start-wave').click();
  const match = await target.newPage(); monitor(match);
  await match.addInitScript(() => { const original = window.setTimeout; window.setTimeout = (callback, delay, ...args) => original(callback, delay === 240 || delay === 140 ? 5000 : delay, ...args); });
  await visit(match, '/'); await match.locator('#hint').click();
  const pair = await match.locator('.hinted').evaluateAll(tiles => tiles.map(t => t.dataset.index));
  for (const index of pair) await match.locator(`[data-index="${index}"]`).click();
  assert.equal(await match.locator('#hint').isDisabled(), true);
  await page.bringToFront();
  await page.locator('#import-progress').setInputFiles(file); await page.waitForSelector('#restore-preview:not([hidden])');
  // Progress earned after preview must survive application of the merge.
  await page.evaluate(async () => { const m = await import('/src/game/learning/progression.js'); localStorage.setItem(m.CAMPAIGN_KEY, JSON.stringify(m.completeLevel(m.emptyProgress(), 'bible-quiz'))); });
  await page.locator('#apply-restore').click(); await page.waitForLoadState('load');
  await page.waitForFunction(() => document.getElementById('transfer-status').textContent.includes('merged'));
  assert.equal(await page.locator('#xp').textContent(), '475'); assert.match(await page.locator('#next-step-title').textContent(), /Nexus/);
  assert.match(await page.locator('#badges').textContent(), /Seven Stars explorer/);
  await arena.waitForSelector('#reload-progress:not([hidden])');
  assert.equal(await arena.locator('#pause').isDisabled(), true);
  const restoredArena = await page.evaluate(() => localStorage.getItem('amazing-grace-vim-defense-v1'));
  await arena.evaluate(async () => { const { app } = await import('/src/game/vim-defense/ui.js'); app.togglePause(); app.reset(); app.write(); });
  assert.equal(await page.evaluate(() => localStorage.getItem('amazing-grace-vim-defense-v1')), restoredArena);
  await arena.locator('#reload-progress').click(); await arena.waitForSelector('#start-wave');
  assert.match(await arena.locator('#score').textContent(), /1800/);
  await match.waitForFunction(() => document.getElementById('level-title').textContent.includes('Level 2'));
  await match.waitForTimeout(5200);
  assert.match(await match.locator('#level-title').textContent(), /Level 2/); assert.equal(await match.locator('#score').textContent(), '0');
  console.log('PASS read-only preview, cancel, merge with fresh progress, post-restore guidance, VIM write fence, and cancellation of stale Match Maker cascades');

  // Re-importing the same file is an explicit no-op.
  await page.locator('#import-progress').setInputFiles(file); await page.waitForSelector('#restore-preview:not([hidden])');
  assert.equal(await page.locator('#apply-restore').isDisabled(), true);
  assert.match(await page.locator('#transfer-status').textContent(), /Nothing needs to change/);
  await page.locator('#cancel-restore').click();
  await mkdir('artifacts', { recursive: true }); await page.screenshot({ path: 'artifacts/learning-passport-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'artifacts/learning-passport-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 750 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(network, []); assert.deepEqual(errors, []);
  await arena.close(); await match.close(); await source.close(); await target.close();
  console.log('PASS repeat-import idempotence, mobile layout, and no upload/API requests or page errors');
} finally { await browser?.close(); server.kill(); }
