import { expect, test } from '@playwright/test';

test('arcade lists and serves the canonical playable game routes', async ({ page, request }) => {
  await page.goto('/arcade/');
  for (const [label, route] of [
    ['Play VIM Defense', '/arcade/vim-defense/'],
    ['Play PowerShell Defense', '/arcade/powershell-defense/'],
    ['Play Code Matrix', '/arcade/code-matrix/'],
    ['Explore the Matrix', '/arcade/matrix-of-conscience/'],
  ]) {
    const link = page.getByRole('link', { name: new RegExp(label) });
    await expect(link).toHaveAttribute('href', route);
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
    expect(response.headers()['content-type'], route).toContain('text/html');
  }
});

test('arcade toolbox publishes one real Chrome extension download', async ({ page, request }) => {
  await page.goto('/arcade/tools/');
  const download = page.locator('a[href="/downloads/NexusToolboxExtension.zip"]');
  await expect(download).toHaveCount(1);
  await expect(download).toHaveAttribute('download', 'NexusToolboxExtension.zip');
  const response = await request.get('/downloads/NexusToolboxExtension.zip');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/zip');
  const zip = await response.body();
  expect(zip.subarray(0, 2).toString('ascii')).toBe('PK');
  expect(zip.length).toBeGreaterThan(100);
});
