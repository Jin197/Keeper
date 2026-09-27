import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('velocewealth-cookies-acknowledged', 'refused');
    } catch (e) {
      // Ignore security errors on about:blank
    }
  });
});

test.describe('i18n routing', () => {
  test('default locale (en) has no prefix', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/$|\/\?/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/cost you next month/i);
  });

  test('French locale renders at /fr', async ({ page }) => {
    await page.goto('/fr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/coûter/i);
  });

  // ES / PT / AR catalogues exist but are not routable at launch (see lib/i18n/routing.ts).
  for (const locale of ['es', 'pt', 'ar', 'de']) {
    test(`unrouted locale /${locale} 404s`, async ({ page }) => {
      const res = await page.goto(`/${locale}`);
      expect(res?.status()).toBe(404);
    });
  }

  test('locale switcher changes URL preserving path', async ({ page }) => {
    await page.goto('/legal/terms');
    await page.locator('select[aria-label="Langue"]').first().selectOption('fr');
    await expect(page).toHaveURL(/\/fr\/legal\/terms/);
  });
});
