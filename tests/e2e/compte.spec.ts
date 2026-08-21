import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

const EMAIL = 'portail-e2e-ok@cupdom-test.invalid';
const PASSWORD = process.env.E2E_PASSWORD_OK;

// Scoped to this file's tests, never at module scope.
test.beforeEach(async ({ page }) => {
  test.skip(!PASSWORD, 'E2E_PASSWORD_OK not set — create the settled portal account first');

  await signIn(page, EMAIL, PASSWORD!, /\/$/);
});

test('la page compte montre les informations, le mot de passe et la base légale', async ({ page }) => {
  await page.goto('/compte');

  await expect(page.getByRole('heading', { name: 'Mon compte', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vos informations', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mot de passe', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Base légale', exact: true })).toBeVisible();
  await expect(page.getByText(EMAIL, { exact: true })).toBeVisible();
});

test('le formulaire refuse un mot de passe trop court, sans rien changer', async ({ page }) => {
  // REFUSAL ONLY. A successful change here would break every other spec file
  // and stale the password in .env.local — see the warning in the plan.
  await page.goto('/compte');

  // exact: true is load-bearing on the "Nouveau mot de passe" label: getByLabel
  // substring-matches by default, same as getByText and getByRole, and
  // "Nouveau mot de passe" is a substring of "Confirmer le nouveau mot de
  // passe" — the unqualified form resolves to both fields and Playwright's
  // strict mode throws.
  await page.getByLabel('Mot de passe actuel', { exact: true }).fill('peu-importe');
  await page.getByLabel('Nouveau mot de passe', { exact: true }).fill('court');
  await page.getByLabel('Confirmer le nouveau mot de passe', { exact: true }).fill('court');
  await page.getByRole('button', { name: 'Changer le mot de passe' }).click();

  await expect(page.locator('form').getByRole('alert')).toContainText('au moins 10 caractères');
});

test('le formulaire refuse deux saisies différentes', async ({ page }) => {
  await page.goto('/compte');

  await page.getByLabel('Mot de passe actuel', { exact: true }).fill('peu-importe');
  await page.getByLabel('Nouveau mot de passe', { exact: true }).fill('un-mot-de-passe-valide');
  await page.getByLabel('Confirmer le nouveau mot de passe', { exact: true }).fill('un-autre-mot-de-passe');
  await page.getByRole('button', { name: 'Changer le mot de passe' }).click();

  await expect(page.locator('form').getByRole('alert')).toContainText('ne correspondent pas');
});

test('la navigation mène au compte', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Mon compte', exact: true }).click();
  await expect(page).toHaveURL(/\/compte/);
});
