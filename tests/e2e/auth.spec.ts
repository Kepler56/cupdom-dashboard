import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

const EMAIL = 'portail-e2e@cupdom-test.invalid';
const PASSWORD = process.env.E2E_PASSWORD;

test('an anonymous visitor is sent to the login page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Votre portail.' })).toBeVisible();
});

test('bad credentials show one generic French message', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(EMAIL);
  await page.getByLabel('Mot de passe').fill('definitely-wrong');
  await page.getByRole('button', { name: 'Se connecter' }).click();

  // Scoped to the form. A bare getByRole('alert') is ambiguous in ANY Next.js
  // app: the framework injects #__next-route-announcer__ with role="alert" on
  // every page, so the plan's unscoped selector hits a strict-mode violation.
  // The jsdom unit test could not catch this — there is no announcer there.
  const alert = page.locator('form').getByRole('alert');
  await expect(alert).toContainText('E-mail ou mot de passe incorrect.');
  // The raw Supabase message must never reach the user: it would reveal whether
  // the address exists.
  await expect(alert).not.toContainText('Invalid login credentials');
  await expect(page).toHaveURL(/\/login$/);
});

test('a client with a temporary password is forced to change it before seeing anything', async ({ page }) => {
  // Scoped to THIS test only. The plan skipped the whole file when E2E_PASSWORD
  // was unset, which also silenced the two tests above that need no credentials
  // — hiding the coverage that can run unattended.
  test.skip(!PASSWORD, 'E2E_PASSWORD not set in .env.local — create the test portal account first');

  await signIn(page, EMAIL, PASSWORD!, /\/mot-de-passe$/);
  await expect(page.getByRole('heading', { name: 'Choisissez votre mot de passe.' })).toBeVisible();

  // And they cannot slip past it by navigating directly.
  await page.goto('/');
  await expect(page).toHaveURL(/\/mot-de-passe$/);
});
