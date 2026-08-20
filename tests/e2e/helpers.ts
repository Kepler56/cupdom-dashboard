import { expect, type Page } from '@playwright/test';

/**
 * How long a sign-in may take before the suite calls it a failure.
 *
 * 45 s, not the 20 s this used to hard-code. The config already explains that a
 * cold Next.js dev compile routinely takes 7-22 s and raises `expect.timeout`
 * to 20 s for exactly that reason — but `toPass` carries its OWN budget and
 * never inherited it, so the one wait that must absorb a first compile had the
 * tightest budget in the suite. Signing in compiles the login route, the sign-in
 * server action AND the destination page in sequence, and under parallel
 * workers several of those compile at once on a single dev server: the release
 * gate failed reproducibly at 20 s on the first test of every spec file, always
 * still sitting on /login.
 *
 * warmup.setup.ts now compiles every route once before any of this runs, so a
 * real sign-in should take a second or two. This budget is the floor underneath
 * that — it is what keeps a skipped or partial warm-up from reading as a broken
 * product. It stays well under the per-test timeout so a genuine hang still
 * fails as a test timeout rather than hanging the run.
 */
export const SIGN_IN_TIMEOUT = 45_000;

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
  }).toPass({ timeout: SIGN_IN_TIMEOUT });
}
