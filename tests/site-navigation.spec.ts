import { expect, test } from '@playwright/test';

test('home navigation, rental content and article link work', async ({ page }) => {
  const home = await page.goto('/');
  expect(home?.status()).toBe(200);
  await expect(page).toHaveTitle(/Amazing Grace Home Living/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Space to belong.');
  await expect(page.locator('.hero').getByRole('link', { name: /Explore rooms/ })).toHaveAttribute('href', '/listings/');
  await expect(page.locator('#clearwater-featured img').first()).toHaveAttribute('src', '/assets/Clearwater/Kitchen.jpg');
  await expect(page.getByRole('heading', { name: /Explore. Compare./ })).toHaveCount(0);

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

test('Matrix Defense opens Act IV directly on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/src/game/tower-defense/index.html?stage=sovereign');
  await expect(page.locator('#mission-status')).toContainText('Mission ready');
  await expect(page.locator('#stage-title')).toContainText('Act IV');
  await page.getByRole('button', { name: /Diplomacy/ }).click();
  await page.locator('#btn-wave').click();
  await expect(page.locator('#btn-wave')).toBeDisabled();
  await expect(page.locator('#wave')).toHaveText('10 / 12');
  await expect(page.getByRole('button', { name: 'Stage 1: Nexus' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('Signalkeepers role selection, journal navigation and active quest continuity work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto('/arcade/matrix-of-conscience/');
  expect(response?.status()).toBe(200);

  const start = page.getByRole('link', { name: 'Choose your role' });
  await expect(start).toBeVisible();
  await expect(page.locator('#journal-link')).toBeHidden();
  await start.click();
  await expect(page.locator('#role-title')).toBeFocused();

  await page.locator('[data-role="navigator"]').click();
  await expect(page.locator('#adventure')).toBeVisible();
  await expect(page.locator('#journal-link')).toBeVisible();

  await page.locator('[data-quest="echo-trail"]').click();
  await expect(page.locator('#quest-panel')).toBeVisible();
  await page.getByRole('link', { name: 'Continue adventure' }).click();
  await expect(page.locator('#quest-panel')).toBeVisible();
  await expect(page.locator('#quest-title')).toBeFocused();

  await page.locator('#journal-link').click();
  await expect(page.locator('#journal-title')).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(390);
});


test('Intune course is discoverable and local progress survives a reload', async ({ page }) => {
  await page.goto('/lms/');
  await page.getByRole('link', { name: /Explore the Intune learning path/ }).click();
  await expect(page).toHaveURL(/\/lms\/microsoft-intune\//);
  await expect(page.getByRole('heading', { name: 'Make Intune operationally ready.' })).toBeVisible();
  await expect(page.locator('.module-card')).toHaveCount(3);
  await expect(page.getByText('0 of 3 modules marked complete')).toBeVisible();
  await page.locator('input[data-complete="reporting"]').check();
  await expect(page.getByText('1 of 3 modules marked complete')).toBeVisible();
  await page.reload();
  await expect(page.locator('input[data-complete="reporting"]')).toBeChecked();
  await page.locator('input[name="q1"][value="b"]').check();
  await page.locator('input[name="q2"][value="b"]').check();
  await page.locator('input[name="q3"][value="a"]').check();
  await page.getByRole('button', { name: 'Check my answers' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Score: 3/3' })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});


test('both room listings show booked status and do not invite unavailable applications', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.locator('.hero .booking-status')).toContainText('Both residences are fully booked.');
  await expect(page.locator('#clearwater-featured .booking-status')).toContainText('Currently fully booked.');
  await page.getByRole('link', { name: /Explore rooms & booking status/ }).click();
  await expect(page).toHaveURL(/\/listings\//);
  await expect(page.locator('#tampa .booking-status')).toContainText('Booked for the next three months.');
  await expect(page.locator('#clearwater .booking-status')).toContainText('Currently fully booked.');
  await expect(page.getByRole('link', { name: /Apply for Tampa/ })).toHaveCount(0);
  await expect(page.locator('a[href*="ApplyNow.aspx"]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(375);
});
