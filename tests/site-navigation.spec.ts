import { expect, test } from '@playwright/test';

test('the homepage links to a working blog', async ({ page }) => {
  const home = await page.goto('/');
  expect(home?.status()).toBe(200);
  await expect(page).toHaveTitle(/Amazing Grace Home Living/);

  const blog = page.getByRole('link', { name: 'Blog', exact: true });
  await expect(blog).toHaveAttribute('href', '/src/blog.html');
  const [response] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === '/src/blog.html'),
    blog.click(),
  ]);
  expect(response.status()).toBe(200);
});
