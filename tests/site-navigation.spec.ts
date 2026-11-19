import { expect, test } from '@playwright/test';

test('home navigation, rental content and article link work', async ({ page }) => {
  const home = await page.goto('/');
  expect(home?.status()).toBe(200);
  await expect(page).toHaveTitle(/Amazing Grace Home Living/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Space to belong.');
  await expect(page.getByRole('heading', { name: /Explore. Compare./ })).toBeVisible();

  const mainNavigation = page.getByRole('navigation', { name: 'Main navigation' });
  await mainNavigation.getByText('Resources', { exact: true }).click();
  const blog = mainNavigation.getByRole('link', { name: 'Blog', exact: true });
  await expect(blog).toBeVisible();
  await expect(blog).toHaveAttribute('href', '/src/blog.html');
  const [response] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === '/src/blog.html'),
    blog.click()
  ]);
  expect(response.status()).toBe(200);
});

test('mobile menu reveals all important site sections', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const menu = page.getByRole('navigation', { name: 'Mobile navigation' });
  const toggle = menu.getByLabel('Open navigation menu');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(menu.getByRole('link', { name: 'Blog' })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Arcade' })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Nexus Toolbox' })).toBeVisible();
});

for (const route of ['/arcade/', '/lms/', '/audio-library/', '/toolbox/']) {
  test(`${route} renders on a narrow viewport`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    if (route === '/lms/') {
      await expect(page.locator('[data-lesson="foundations"]')).toBeEnabled();
      await expect(page.locator('[data-lesson="tactics"]')).toBeDisabled();
    }
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(375);
  });
}

test('both Tampa and Clearwater property sections and galleries are available', async ({ page }) => {
  await page.goto('/listings/');
  await expect(page.getByRole('heading', { name: '926 E Poinsettia Ave' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '118 S San Remo Ave' })).toBeVisible();
  const clearwater = page.locator('#clearwater');
  const photos = clearwater.locator('[data-city="Clearwater"] .gallery-photo');
  await expect(photos).toHaveCount(3);
  await expect(photos.first().locator('img')).toHaveAttribute('src', '/assets/Clearwater/Kitchen.jpg');
  await clearwater.locator('.gallery-photo').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: /Close photo viewer/ }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('only curated Clearwater photos are published to the static site', async ({ page }) => {
  const kitchen = await page.request.get('/assets/Clearwater/Kitchen.jpg');
  expect(kitchen.status()).toBe(200);
  for (const file of ['COYV1031.JPG', 'RXKW9348.JPG']) {
    const response = await page.request.get('/assets/Clearwater/' + file);
    expect(response.status()).toBe(404);
  }
});

test('Matrix Defense initializes and enforces a locked mission', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/src/game/tower-defense/index.html?stage=boss');
  await expect(page.locator('#mission-status')).toContainText('Locked');
  await expect(page.locator('#btn-wave')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Stage 1: Nexus' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
