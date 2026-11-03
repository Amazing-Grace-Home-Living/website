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
  let chatCalls = 0;
  page.on('pageerror', error => errors.push(error.message));
  await page.route('http://127.0.0.1:1234/**', route => {
    const request = route.request();
    const headers = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'accept, content-type, authorization',
      'Content-Type': 'application/json',
    };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (request.url().endsWith('/models')) return route.fulfill({ headers, body: JSON.stringify({ data: [{ id: 'local-study-model' }] }) });
    if (request.url().endsWith('/chat/completions')) {
      const body = request.postDataJSON();
      assert.equal(body.model, 'local-study-model');
      if (body.messages[0].role === 'system') {
        chatCalls++;
        assert.equal(body.messages.at(-1).content, chatCalls === 1 ? 'Help me plan a website.' : 'Explain that further.');
        if (chatCalls === 2) assert.equal(body.messages.length, 4);
        return route.fulfill({ headers, body: JSON.stringify({ choices: [{ message: { content: 'A clear layout helps. <img src=x onerror=alert(1)>' } }] }) });
      }
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
  assert.equal(await page.locator('.lms-brand .brand-compact').isVisible(), true);
  await page.locator('#ai-token').fill('test-session-token');
  assert.equal(await page.locator('#companion-send').isDisabled(), true);
  await page.locator('#ai-check').click();
  await page.waitForFunction(() => document.querySelector('#ai-model').value === 'local-study-model');
  assert.equal(await page.locator('#ai-test').isEnabled(), true);
  await page.locator('#ai-test').click();
  await page.waitForFunction(() => document.querySelector('#ai-setup-status').textContent.includes('Smoke test passed'));
  const preference = await page.evaluate(() => JSON.parse(localStorage.getItem('amazing-grace-lmstudio-settings-v1')));
  assert.deepEqual(preference, { endpoint: 'http://127.0.0.1:1234/v1', model: 'local-study-model' });
  assert.equal(await page.evaluate(() => Object.keys(localStorage).some(key => /api.?key|token/i.test(key))), false);
  assert.equal(await page.evaluate(() => Object.values(localStorage).some(value => value.includes('test-session-token'))), false);
  await page.locator('#companion-prompt').fill('Help me plan a website.');
  await page.locator('#companion-send').click();
  await page.waitForFunction(() => document.querySelector('#companion-status').textContent.startsWith('Reply ready'));
  assert.equal(await page.locator('#companion-messages article').count(), 2);
  assert.equal(await page.locator('#companion-messages img').count(), 0);
  await page.locator('#companion-prompt').fill('Explain that further.');
  await page.locator('#companion-send').click();
  await page.waitForFunction(() => document.querySelectorAll('#companion-messages article').length === 4);
  assert.equal(await page.evaluate(() => Object.values(localStorage).some(value => value.includes('Help me plan a website.'))), false);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('#companion-clear').click();
  assert.equal(await page.locator('#companion-messages article').count(), 0);
  await page.getByRole('button', { name: 'Reset local preference' }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem('amazing-grace-lmstudio-settings-v1')), null);
  assert.equal(await page.locator('#ai-endpoint').inputValue(), 'http://127.0.0.1:1234/v1');
  assert.equal(await page.locator('#ai-token').inputValue(), '');
  assert.equal(await page.locator('#companion-send').isDisabled(), true);
  await page.locator('#ai-endpoint').fill('https://example.com/v1');
  await page.locator('#ai-check').click();
  await page.waitForFunction(() => document.querySelector('#ai-setup-status').textContent.includes('Use a local LM Studio endpoint'));
  await page.goto(origin);
  assert.equal(await page.locator('.featured-photos img').count(), 4);
  for (const img of await page.locator('.featured-photos img').all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate(image => image.decode());
  }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'artifacts/home-photo-preview-mobile.png', fullPage: true });
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(`${origin}/lms/#ai-setup`);
  await page.screenshot({path:'artifacts/companion-desktop.png',fullPage:true});
  assert.deepEqual(errors, []);
  console.log('PASS discovery, smoke test, multi-turn chat, text-safe replies, private storage, reset, endpoint validation, mobile layout, homepage photos and logos; no page errors');
} catch (error) {
  const page = browser?.contexts()[0]?.pages()[0];
  if (page) {
    console.log(await page.locator('#companion-send').evaluate(el => ({disabled:el.disabled,rect:el.getBoundingClientRect().toJSON(),status:document.querySelector('#companion-status').textContent})).catch(()=>null));
    await page.screenshot({path:'artifacts/extension-test-failure.png',fullPage:true}).catch(()=>{});
  }
  throw error;
} finally {
  await browser?.close();
  server.kill();
}
