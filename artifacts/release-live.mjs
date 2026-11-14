import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  for (const path of ['/', '/arcade/', '/listings/', '/lms/', '/arcade/vim-defense/']) {
    const response = await page.goto('https://amazinggracehl.org' + path);
    assert.equal(response.status(), 200, path);
    if (path === '/listings/') {
      assert.equal(await page.locator('.listing').count(), 1);
      assert.match(await page.locator('meta[name="description"]').getAttribute('content'), /\$850\/month/);
    }
    if (path === '/lms/') await page.getByRole('button', { name: 'Reset local preference' }).waitFor();
    console.log('PASS live ' + path);
  }
  await page.locator('#start-wave').click();
  await page.locator('#arena').scrollIntoViewIfNeeded();
  const box = await page.locator('#arena').boundingBox();
  const before = await page.evaluate(async () => (await import('/src/game/vim-defense/ui.js')).app.game.stock);
  await page.mouse.click(box.x + 50, box.y + 50, { button: 'right' });
  const after = await page.evaluate(async () => (await import('/src/game/vim-defense/ui.js')).app.game.stock);
  assert.equal(after, before - 1);
  assert.deepEqual(errors, []);
  console.log('PASS live right-click drone; no page errors');
} finally { await browser.close(); }
