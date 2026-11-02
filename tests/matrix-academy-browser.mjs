import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const port = 4185;
const server = spawn(process.execPath, ['scripts/serve.mjs', process.env.SITE_ROOT || 'dist'], {
  stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: String(port) },
});
let browser;
try {
  await new Promise((resolve, reject) => {
    server.stdout.once('data', resolve);
    server.once('error', reject);
    server.once('exit', code => reject(Error(`Server exited ${code}`)));
  });
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && new URL(response.url()).port === String(port)) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(`http://127.0.0.1:${port}/arcade/matrix_of_consciousness_match_3_game.html`);
  await page.evaluate(() => localStorage.setItem('graceNexusProgress', '{"legacy":"preserve"}'));
  assert.match(await page.locator('#moved-title').textContent(), /joined Code Matrix/);
  assert.equal(await page.locator('.gem-cell').count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole('link', { name: 'Play Code Matrix' }).click();
  await page.waitForSelector('.tile');
  assert.match(await page.title(), /Code Matrix/);
  assert.equal(await page.locator('.tile').count(), 49);
  assert.match(await page.locator('.tile').first().getAttribute('aria-label'), /Variable|Wildcard|Code block|Function|Markup/);
  assert.equal(await page.evaluate(() => localStorage.getItem('graceNexusProgress')), '{"legacy":"preserve"}');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('#hint').click();
  const pair = await page.locator('.hinted').evaluateAll(tiles => tiles.map(tile => tile.dataset.index));
  for (const index of pair) await page.locator(`[data-index="${index}"]`).click();
  await page.waitForFunction(() => Number(document.querySelector('#score').textContent.replaceAll(',', '')) > 0);
  assert.deepEqual(errors, []);
  console.log('PASS legacy handoff, Code Matrix mobile board and symbols, preserved legacy save, playable bonus puzzle; no page errors');
} finally {
  await browser?.close();
  server.kill();
}
