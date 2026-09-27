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

test.describe('Auth pages (UI only — no Supabase required)', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/fr/login');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/mot de passe/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /se connecter/i }),
    ).toBeVisible();
  });

  test('signup page collects required fields', async ({ page }) => {
    await page.goto('/fr/signup');
    await expect(page.getByLabel(/nom complet/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/mot de passe/i)).toBeVisible();
    await expect(page.getByLabel(/pays/i)).toBeVisible();
    await expect(page.getByLabel(/devise/i)).toBeVisible();
  });

  test('forgot-password page renders form', async ({ page }) => {
    await page.goto('/fr/forgot-password');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /recevoir le lien/i }),
    ).toBeVisible();
  });

  test('login → signup link works', async ({ page }) => {
    await page.goto('/fr/login');
    await page.getByRole('link', { name: /créer un compte/i }).click({ force: true });
    await expect(page).toHaveURL(/\/signup/);
  });
});

test.describe('Legal pages', () => {
  test('terms render in both languages', async ({ page }) => {
    await page.goto('/legal/terms');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/terms of service/i);
    await expect(page.locator('body')).toContainText(/10 characters/);
    // Post-pivot facts: two plans, and the affiliate disclosure must be present.
    await expect(page.locator('body')).toContainText(/Free .*and Pro|Two plans/);
    await expect(page.locator('body')).toContainText(/commission/i);
    await page.goto('/fr/legal/terms');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/conditions/i);
    await expect(page.locator('body')).toContainText(/10 caractères/);
  });

  test('privacy page names its processors and the EU hosting', async ({ page }) => {
    await page.goto('/legal/privacy');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/privacy/i);
    await expect(page.locator('body')).toContainText(/Supabase/);
    await expect(page.locator('body')).toContainText(/European Union/);
    await page.goto('/fr/legal/privacy');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/confidentialité/i);
  });

  test('imprint never invents a company identity', async ({ page }) => {
    await page.goto('/legal/imprint');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/imprint/i);
    // The fabricated details that used to ship here must never come back.
    await expect(page.locator('body')).not.toContainText('922 834 105');
    await expect(page.locator('body')).not.toContainText('FR92922834105');
    await expect(page.locator('body')).not.toContainText('Rue de la Paix');
  });

  test('cookies page lists every cookie we set', async ({ page }) => {
    await page.goto('/legal/cookies');
    await expect(page.locator('body')).toContainText(/sb-access-token/);
    await expect(page.locator('body')).toContainText(/NEXT_LOCALE/);
    await expect(page.locator('body')).toContainText(/no advertising cookie/i);
  });
});

test.describe('Pricing', () => {
  test('shows the Free and Pro plans', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('section#pricing')).toContainText(/Free/);
    await expect(page.locator('section#pricing')).toContainText(/Pro/);
  });
});
