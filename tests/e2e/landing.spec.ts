import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('keeper-cookies-acknowledged', 'refused');
    } catch (e) {
      // Ignore security errors on about:blank
    }
  });
});

test.describe('Landing page', () => {
  test('renders hero with primary CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /add my car/i }).first()).toBeVisible();
  });

  test('shows the three pain cards', async ({ page }) => {
    await page.goto('/');
    const pains = await page.locator('section').filter({ hasText: /sound familiar/i }).getByRole('heading', { level: 3 }).all();
    expect(pains.length).toBe(3);
  });

  test('data-sources table lists the launch countries', async ({ page }) => {
    await page.goto('/');
    const table = page.locator('section#features table');
    await expect(table).toBeVisible();
    await expect(table).toContainText('United Kingdom');
    await expect(table).toContainText('France');
  });

  test('pricing shows a local currency amount and the yearly toggle', async ({ page }) => {
    await page.goto('/');
    const pricing = page.locator('section#pricing');
    await expect(pricing.getByRole('button', { name: /yearly/i })).toBeVisible();
    await expect(pricing.getByText(/\/ month/).first()).toBeVisible();
  });

  test('FAQ accordions expand', async ({ page }) => {
    await page.goto('/');
    const firstFaq = page.locator('details').first();
    await firstFaq.locator('summary').click();
    await expect(firstFaq).toHaveAttribute('open', '');
  });

  test('signup CTA navigates to /signup', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /add my car/i }).first().click({ force: true });
    await expect(page).toHaveURL(/\/signup/);
    await expect(page.getByRole('heading', { name: /create/i })).toBeVisible();
  });
});
