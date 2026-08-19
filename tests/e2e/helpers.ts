import { expect, type Page } from '@playwright/test';

/**
 * Sign in and wait for the destination the account is entitled to.
 *
 * Why this is not three inline lines: a wrong password and a slow first compile
 * both leave the browser sitting on /login, and `toHaveURL` reports the two
 * identically — "expected /mot-de-passe, received /login". That sends whoever
 * created the test accounts hunting through the product for a bug that is
 * really a typo in .env.local, or vice versa.
 *
 * So this polls for the destination, and if the form's error alert appears it
 * fails with the message the user would have read. The last thrown error is
 * what Playwright reports, so a rejected sign-in says « Connexion refusée : … »
 * instead of a URL mismatch.
 */
export async function signIn(page: Page, email: string, password: string, destination: RegExp) {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();

  // Scoped to the form: Next.js injects #__next-route-announcer__ with
  // role="alert" on every page, so a bare getByRole('alert') is ambiguous.
  const alert = page.locator('form').getByRole('alert');

  await expect(async () => {
    if (await alert.isVisible()) {
      throw new Error(`Connexion refusée : ${(await alert.textContent())?.trim()}`);
    }
    expect(page.url()).toMatch(destination);
  }).toPass({ timeout: 20_000 });
}
