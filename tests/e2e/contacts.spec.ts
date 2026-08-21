import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

const EMAIL = 'portail-e2e-ok@cupdom-test.invalid';
const PASSWORD = process.env.E2E_PASSWORD_OK;

// Scoped to this file's tests, never at module scope: a module-level skip would
// also silence any credential-free test added here later.
test.beforeEach(async ({ page }) => {
  test.skip(!PASSWORD, 'E2E_PASSWORD_OK not set — create the settled portal account first');

  await signIn(page, EMAIL, PASSWORD!, /\/$/);
});

test('la page contacts se charge et cite la base légale', async ({ page }) => {
  await page.goto('/contacts');

  await expect(page.getByRole('heading', { name: 'Contacts captés', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: /E-mail/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Base légale', exact: true })).toBeVisible();

  // The consent quotation must be the recorded wording, not a placeholder.
  //
  // STRAIGHT apostrophe (U+0027), deliberately — and this is the one assertion
  // in the file where the character matters. Everything this codebase WRITES
  // uses the typographic U+2019, but this sentence is not ours to style: it is
  // evidence, quoted byte-for-byte out of `lead_consents`, and the CRM recorded
  // it with U+0027 (`lib/public/consent.ts`, the lead-submit Edge Function and
  // the seed all agree). ConsentPanel's doc comment says as much. A U+2019 here
  // would never match, and the failure would read as « the legal basis is
  // missing » rather than « the test typed the wrong apostrophe ».
  await expect(page.getByText(/J'accepte que mes données soient traitées par Cupdom/)).toBeVisible();
});

test('le tri par nom change l’ordre affiché', async ({ page }) => {
  await page.goto('/contacts?tri=nom.asc');
  const ascending = await page.locator('tbody tr td:first-child').first().textContent();

  await page.goto('/contacts?tri=nom.desc');
  const descending = await page.locator('tbody tr td:first-child').first().textContent();

  expect(ascending).not.toBe(descending);
});

test('la recherche distingue « rien trouvé » de « rien encore »', async ({ page }) => {
  await page.goto('/contacts?q=zzzzzzzz');

  // exact: true is load-bearing. EmptyState renders the title in one <p> and
  // the explanation in another, and the explanation OPENS with the title's
  // words (« Aucun contact ne correspond à « zzzzzzzz » … »). getByText
  // substring-matches by default, so the bare string resolves to two visible
  // elements and toBeVisible — which is strict — throws. Same class of bug the
  // overview and campagnes specs already document.
  await expect(page.getByText('Aucun contact ne correspond', { exact: true })).toBeVisible();
  await expect(page.getByText('Pas encore de contacts captés')).toHaveCount(0);
});

test('le lien d’export porte les filtres actifs', async ({ page }) => {
  await page.goto('/contacts?c=demo-rex-club&tri=nom.asc');

  const href = await page.getByRole('link', { name: /Exporter en CSV/ }).getAttribute('href');
  expect(href).toContain('c=demo-rex-club');
  expect(href).toContain('tri=nom.asc');
});

test('l’export renvoie un CSV téléchargeable', async ({ page }) => {
  await page.goto('/contacts');

  const response = await page.request.get('/contacts/export?tri=date.desc');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/csv');
  expect(response.headers()['content-disposition']).toContain('attachment');

  const body = await response.text();
  // UTF-8 BOM first, then the French headers.
  expect(body.charCodeAt(0)).toBe(0xfeff);
  expect(body).toContain('Nom;Prénom;E-mail;Téléphone;Campagne;Capté le');
});

/**
 * Task 7's step 4, which asked a human to sign out and hit the URL by hand.
 *
 * The `request` fixture is an isolated APIRequestContext — it does NOT share
 * the browser context's cookies, so this call carries no session at all. Two
 * independent gates should stop it: the middleware redirects an unauthenticated
 * request to /login, and if it ever reached the handler, `client_campaigns()`
 * raises insufficient_privilege and the route answers 403. The assertion is on
 * the outcome rather than on which gate fired, because either is correct and
 * only one thing must never happen: personal data leaving the server.
 */
test('un export sans session ne renvoie jamais de CSV', async ({ request }) => {
  const response = await request.get('/contacts/export?tri=date.desc');

  expect(response.headers()['content-type'] ?? '').not.toContain('text/csv');
  expect(await response.text()).not.toContain('Nom;Prénom;E-mail');
});

test('la navigation mène aux contacts', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Contacts captés', exact: true }).click();
  await expect(page).toHaveURL(/\/contacts/);
});
