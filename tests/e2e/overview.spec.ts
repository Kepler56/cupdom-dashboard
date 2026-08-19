import { expect, test } from '@playwright/test';

const EMAIL = 'portail-e2e-ok@cupdom-test.invalid';
const PASSWORD = process.env.E2E_PASSWORD_OK;

// Scoped to this file's tests, never at module scope: a module-level skip would
// also silence any credential-free test added here later.
test.beforeEach(async ({ page }) => {
  test.skip(!PASSWORD, 'E2E_PASSWORD_OK not set — create the settled portal account first');

  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(EMAIL);
  await page.getByLabel('Mot de passe').fill(PASSWORD!);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('the four KPI tiles render with French labels', async ({ page }) => {
  await expect(page.getByText('Personnes touchées')).toBeVisible();
  await expect(page.getByText('Scans totaux')).toBeVisible();
  await expect(page.getByText('Contacts captés')).toBeVisible();
  await expect(page.getByText('Taux de captation')).toBeVisible();
});

test('the period selector drives the URL', async ({ page }) => {
  await page.getByRole('link', { name: '7 jours' }).click();
  await expect(page).toHaveURL(/p=7j/);
});

// Spec §4.9 — the one module that deliberately ignores the period must say so
// on screen, or the period pills imply a scope it does not have.
test('the funnel states that it covers the whole campaign', async ({ page }) => {
  await expect(page.getByText(/depuis le début/i).first()).toBeVisible();
});
