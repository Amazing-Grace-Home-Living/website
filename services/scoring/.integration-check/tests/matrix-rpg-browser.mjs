import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { QUESTS, CHAPTERS } from '../src/game/matrix-rpg/content.js';
import { RPG_KEY } from '../src/game/matrix-rpg/engine.js';
import { LESSONS } from '../src/game/learning/curriculum.js';
const port = 4182;
const server = spawn(process.execPath, ['scripts/serve.mjs', 'dist'], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: String(port) } });
let browser;
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(Error(`Server exited ${code}`))); });
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && new URL(response.url()).port === String(port)) errors.push(`${response.status()} ${response.url()}`); });
  const visit = path => page.goto(`http://127.0.0.1:${port}${path}`);
  await visit('/arcade/');
  await page.locator('a[href="/arcade/matrix-of-conscience/"]').click();
  await page.waitForSelector('[data-role="navigator"]');
  await page.locator('[data-role="navigator"]').focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('[data-chapter="commons"]').isDisabled(), true);
  assert.equal(await page.locator('[data-quest="root-guardian"]').isDisabled(), true);
  console.log('PASS role selection, chapter and guardian locks');

  async function solve(id, options = {}) {
    const q = QUESTS.find(q => q.id === id);
    await page.locator(`[data-quest="${id}"]`).click();
    if (q.type === 'memory') {
      await page.getByRole('button', { name: 'Hide clue · ready to recall' }).click();
      if (options.missMemory) {
        for (let i = 0; i < q.sequence.length; i++) await page.locator('[data-rune="0"]').click();
        assert.match(await page.locator('#quest-feedback').textContent(), /Not quite/);
        await page.getByRole('button', { name: 'Review clue', exact: true }).click();
        await page.getByRole('button', { name: 'Hide clue · ready to recall' }).click();
      }
      for (const rune of q.reverse ? [...q.sequence].reverse() : q.sequence) await page.locator(`[data-rune="${rune}"]`).click();
    } else if (q.type === 'route') {
      await page.locator('[data-cell="14"]').click();
      assert.match(await page.locator('#quest-feedback').textContent(), /neighboring tile/);
      const path = id === 'bridge-run' ? [21, 22, 17, 12, 13, 14, 9, 4] : [15, 10, 11, 12, 13, 14, 9, 4];
      for (const cell of path) await page.locator(`[data-cell="${cell}"]`).click();
    } else if (q.type === 'choice') {
      await page.locator(`[data-choice="${q.choices[0].id}"]`).click();
      assert.match(await page.locator('.choice-outcome').textContent(), /question to carry/);
      await page.getByRole('button', { name: 'Record this story choice' }).click();
    } else {
      if (options.retryGuardian) {
        const first = q.questions[0];
        for (let answer = 0; answer < first.options.length; answer++) if (answer !== first.answer) await page.locator(`[data-answer="${answer}"]`).click();
        await page.locator(`[data-answer="${first.answer}"]`).click();
        await page.getByRole('button', { name: 'Next signal' }).click();
        await page.locator(`[data-answer="${(q.questions[1].answer + 1) % 3}"]`).click();
        assert.match(await page.locator('#quest-feedback').textContent(), /completed quests are safe/);
        assert.equal(await page.locator('.battle-bars progress').first().getAttribute('value'), '0');
        await page.getByRole('button', { name: 'Review and retry encounter' }).click();
      }
      for (const [index, question] of q.questions.entries()) {
        if (index === 0) await page.locator('.hint summary').click();
        await page.locator(`[data-answer="${question.answer}"]`).click();
        await page.getByRole('button', { name: index === q.questions.length - 1 ? q.type === 'guardian' ? 'Restore the final signal' : 'Finish challenge' : 'Next signal' }).click();
      }
    }
    await page.waitForSelector('#quest-result .reward');
    await page.locator('#quest-result button').click();
  }

  await solve('echo-trail', { missMemory: true });
  assert.equal(await page.locator('#hero-xp').textContent(), '25');
  await page.reload();
  await page.waitForSelector('[data-quest="echo-trail"]');
  assert.equal(await page.locator('#hero-xp').textContent(), '25');
  await solve('echo-trail'); assert.equal(await page.locator('#hero-xp').textContent(), '25');
  console.log('PASS memory feedback, checkpoint reload, and replay XP');
  for (const chapter of CHAPTERS) {
    await page.locator(`[data-chapter="${chapter.id}"]`).click();
    for (const id of chapter.quests) {
      if (id === 'echo-trail') continue;
      await solve(id, { retryGuardian: id === 'root-guardian' });
      // Completing a guardian selects the newly opened region. Select the current one only for its remaining tasks.
    }
    console.log(`PASS ${chapter.title}: quests, guardian, relic, and campaign milestone`);
  }
  assert.equal(await page.locator('#hero-xp').textContent(), '410');
  assert.equal(await page.locator('#hero-level').textContent(), '5');
  assert.equal(await page.locator('#quest-count').textContent(), '12 / 12');
  assert.equal(await page.locator('.relic').count(), 3);
  assert.equal(await page.locator('.journal-entry').count(), 3);
  assert.equal(await page.locator('#ending').isVisible(), true);
  await page.locator('.camp summary').click(); await page.selectOption('#role-select', 'mediator');
  assert.equal(await page.locator('#hero-xp').textContent(), '410');
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/matrix-rpg-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'artifacts/matrix-rpg-mobile.png', fullPage: true });
  await page.locator('[data-chapter="commons"]').click();
  await page.locator('[data-quest="bridge-run"]').click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.ok((await page.locator('.route-cell').first().boundingBox()).width >= 44);
  await page.screenshot({ path: 'artifacts/matrix-rpg-route-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 750 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await visit('/lms/'); await page.waitForSelector('#rpg-status');
  assert.match(await page.locator('#rpg-status').textContent(), /3 \/ 3/);
  assert.equal(await page.locator('#xp').textContent(), '325');
  await page.locator('[data-lesson="foundations"]').click();
  for (const [i, question] of LESSONS[0].questions.entries()) await page.locator(`input[name="q${i}"][value="${question.answer}"]`).check();
  await page.locator('#submit-quiz').click();
  assert.equal(await page.locator('#xp').textContent(), '375');
  assert.match(await page.locator('#mission-cards article').first().textContent(), /Unlocked/);
  await visit('/arcade/matrix-of-conscience/');
  await page.waitForSelector('#hero-xp');
  assert.equal(await page.locator('#hero-xp').textContent(), '410');
  await page.locator('.camp summary').click();
  page.once('dialog', dialog => dialog.accept()); await page.locator('#new-adventure').click();
  assert.equal(await page.locator('#role-screen').isVisible(), true);
  await visit('/lms/'); assert.equal(await page.locator('#xp').textContent(), '375');
  assert.deepEqual(errors, []);

  const blocked = await browser.newContext();
  await blocked.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw Error('storage blocked'); } }));
  const p = await blocked.newPage(); const blockedErrors = []; p.on('pageerror', e => blockedErrors.push(e.message));
  await p.goto(`http://127.0.0.1:${port}/arcade/matrix-of-conscience/`);
  await p.locator('[data-role="archivist"]').click();
  assert.match(await p.locator('#save-status').textContent(), /Saving unavailable/);
  await p.locator('[data-quest="echo-trail"]').click();
  await p.getByRole('button', { name: 'Hide clue · ready to recall' }).click();
  for (const rune of QUESTS[0].sequence) await p.locator(`[data-rune="${rune}"]`).click();
  assert.equal(await p.locator('#hero-xp').textContent(), '25');
  assert.deepEqual(blockedErrors, []);
  await blocked.close();
  // A fresh page recovers cleanly from a broken adventure save.
  await page.evaluate(key => localStorage.setItem(key, '{broken'), RPG_KEY);
  await visit('/arcade/matrix-of-conscience/');
  await page.waitForSelector('#role-screen:not([hidden])');
  console.log('PASS all 12 quests, guardian retry, branch journal, role change, ending, LMS unlock, reset isolation, mobile layouts, blocked storage, corrupt-save recovery; no page errors');
} finally { await browser?.close(); server.kill(); }
