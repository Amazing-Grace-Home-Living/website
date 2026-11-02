import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const port = 4187;
const origin = `http://127.0.0.1:${port}`;
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
  await page.route('http://127.0.0.1:1234/**', route => {
    const request = route.request();
    const headers = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'accept, content-type',
      'Content-Type': 'application/json',
    };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (request.url().endsWith('/models')) return route.fulfill({ headers, body: JSON.stringify({ data: [{ id: 'local-study-model' }] }) });
    if (request.url().endsWith('/chat/completions')) {
      const body = request.postDataJSON();
      assert.equal(body.model, 'local-study-model');
      assert.equal(body.messages[0].content, 'Reply with exactly: Local study companion ready.');
      return route.fulfill({ headers, body: JSON.stringify({ choices: [{ message: { content: 'Local study companion ready.' } }] }) });
    }
    return route.fulfill({ status: 404, headers, body: JSON.stringify({ error: { message: 'Unknown test endpoint' } }) });
  });
  await page.goto(`${origin}/arcade/tools/`);
  assert.equal(await page.locator('.tools-card').count(), 4);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole('link', { name: 'Open player profile' }).click();
  await page.waitForSelector('#profile-title');
  assert.match(await page.title(), /Arcade profile/);
  await page.goto(`${origin}/lms/`);
  await page.locator('#ai-check').click();
  await page.waitForFunction(() => document.querySelector('#ai-model').value === 'local-study-model');
  assert.equal(await page.locator('#ai-test').isEnabled(), true);
  await page.locator('#ai-test').click();
  await page.waitForFunction(() => document.querySelector('#ai-setup-status').textContent.includes('Smoke test passed'));
  const preference = await page.evaluate(() => JSON.parse(localStorage.getItem('amazing-grace-lmstudio-settings-v1')));
  assert.deepEqual(preference, { endpoint: 'http://127.0.0.1:1234/v1', model: 'local-study-model' });
  assert.equal(await page.evaluate(() => Object.keys(localStorage).some(key => /api.?key|token/i.test(key))), false);
  await page.getByRole('button', { name: 'Reset local preference' }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem('amazing-grace-lmstudio-settings-v1')), null);
  assert.equal(await page.locator('#ai-endpoint').inputValue(), 'http://127.0.0.1:1234/v1');
  assert.deepEqual(errors, []);
  console.log('PASS LM Studio discovery, chat smoke test, local endpoint/model persistence, credential-free storage, reset; no page errors');
} finally {
  await browser?.close();
  server.kill();
}
