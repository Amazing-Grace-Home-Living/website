import { test, expect } from '@playwright/test';

test('VimDefender visual regression', async ({ page }) => {
  // Start the dev server manually before running the test in CI.
  // Assume the dev server is already running on localhost:3000.
  await page.goto('http://localhost:3000/vim-defender');
  // Click the start button – adjust selector if needed.
  const startBtn = page.getByRole('button', { name: /start/i });
  await startBtn.click();
  // Wait a short moment for the canvas to render.
  await page.waitForTimeout(500);
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  // Visual regression snapshot.
  await expect(canvas).toHaveScreenshot({ timeout: 5000 });
});
