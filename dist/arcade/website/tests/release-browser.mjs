import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const server = spawn(process.execPath, ['scripts/serve.mjs', 'dist'], {
  stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: '4187' },
});
let browser;
try {
  await new Promise((resolve, reject) => {
    server.stdout.once('data', resolve); server.once('error', reject);
    server.once('exit', code => reject(Error('Preview exited: ' + code)));
  });
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('amazing-grace-lmstudio-settings-v1', 'null'));
  await page.goto('http://127.0.0.1:4187/lms/');
  let finishRequest;
  const delayed = new Promise(resolve => { finishRequest = resolve; });
  let intercepted;
  const started = new Promise(resolve => { intercepted = resolve; });
  await page.route('**/v1/models', async route => {
    intercepted(); await delayed;
    await route.fulfill({ json: { data: [{ id: 'stale-model' }] } }).catch(() => {});
  });
  await page.locator('#ai-check').click(); await started;
  await page.getByRole('button', { name: 'Reset local preference' }).click();
  finishRequest();
  await page.waitForFunction(() => document.querySelector('#ai-setup-status').textContent.startsWith('Local preference reset'));
  assert.equal(await page.locator('#ai-model').isDisabled(), true);
  assert.equal(await page.evaluate(() => localStorage.getItem('amazing-grace-lmstudio-settings-v1')), null);
  await page.unroute('**/v1/models');
  await page.route('**/v1/models', route => route.fulfill({ json: { data: [{ id: 'local-model' }] } }));
  await page.locator('#ai-check').click();
  await page.waitForFunction(() => document.querySelector('#ai-setup-badge').textContent === 'Ready');
  assert.equal(await page.locator('#ai-model').inputValue(), 'local-model');
  await page.route('**/v1/chat/completions', route => route.fulfill({ json: { choices: [{ message: { content: 'Local study companion ready.' } }] } }));
  await page.locator('#ai-test').click();
  await page.waitForFunction(() => document.querySelector('#ai-setup-status').textContent.startsWith('Smoke test passed'));
  await page.locator('#ai-endpoint').fill('http://127.0.0.1:4321/v1');
  assert.equal(await page.locator('#ai-test').isDisabled(), true);
  assert.equal(await page.locator('#ai-model').isDisabled(), true);
  assert.equal(await page.locator('#ai-setup-badge').textContent(), 'Not checked');
  for (const path of ['/arcade/', '/arcade/academy/', '/src/game/star-matrix/index.html', '/listings/']) {
    await page.goto('http://127.0.0.1:4187' + path);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path + ' overflows mobile width');
  }
  assert.deepEqual(errors, []);
  console.log('PASS release navigation, mobile layouts, corrupt AI preferences, reset during discovery, model discovery and smoke-test UI (mock local server)');
} finally { await browser?.close(); server.kill(); }
