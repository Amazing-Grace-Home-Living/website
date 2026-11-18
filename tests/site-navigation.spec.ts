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
  await page.getByRole('navigation', { name: 'Mobile navigation' })
    .getByLabel('Open navigation menu').click();
  const menu = page.getByRole('navigation', { name: 'Mobile navigation' });
  await expect(menu.getByRole('link', { name: 'Blog' })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Arcade' })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Nexus Toolbox' })).toBeVisible();
});

test('both Tampa and Clearwater property sections and galleries are available', async ({ page }) => {
  await page.goto('/listings/');
  await expect(page.getByRole('heading', { name: '926 E Poinsettia Ave' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '118 S San Remo Ave' })).toBeVisible();
  const clearwater = page.locator('#clearwater');
  await expect(clearwater.locator('[data-city="Clearwater"] .gallery-photo')).toHaveCount(5);
  await clearwater.locator('.gallery-photo').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: /Close photo viewer/ }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
});
