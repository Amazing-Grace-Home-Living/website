import { expect, test } from '@playwright/test';

test('Intune incident game is playable, reloadable and responsive without sign-in', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const response = await page.goto('/lms/microsoft-intune/mission/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /Intune Ops:/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The disappearing devices' })).toBeVisible();
  await page.getByRole('button', { name: /Compare enrollment, check-in timestamps/ }).click();
  await expect(page.getByText('+100 points')).toBeVisible();
  await expect(page.locator('#run-score')).toHaveText('100 / 600');
  await page.reload();
  await expect(page.locator('#run-score')).toHaveText('100 / 600');
  await expect(page.getByRole('heading', { name: 'Green does not mean current' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('Intune incident game debriefs six decisions and allows a new local run', async ({ page }) => {
  await page.goto('/lms/microsoft-intune/mission/');
  for (const pattern of [
    /Compare enrollment, check-in timestamps/,
    /Report compliance and check-in recency separately/,
    /Assign an appropriate Intune role and scope/,
    /Confirm authorization, share a minimum-necessary summary/,
    /Check tenant service health and advisories/,
    /Document a baseline, pilot representative groups/,
  ]) {
    await page.getByRole('button', { name: pattern }).click();
    await expect(page.locator('#case-feedback')).toBeVisible();
    await page.getByRole('button', { name: /Continue to next case|View final debrief/ }).click();
  }
  await expect(page.getByRole('heading', { name: 'Mission complete' })).toBeVisible();
  await expect(page.locator('#run-score')).toHaveText('600 / 600');
  await page.getByRole('button', { name: 'Start a new run' }).click();
  await expect(page.locator('#run-score')).toHaveText('0 / 600');
  await expect(page.locator('#best-score')).toHaveText('600 / 600');
});
