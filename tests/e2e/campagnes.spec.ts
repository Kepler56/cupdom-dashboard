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

test('la liste des campagnes montre les trois campagnes et mène au détail', async ({ page }) => {
  await page.goto('/campagnes');

  // exact: true is load-bearing, not cosmetic: getByRole's name matching is
  // substring by default too, and the table's own subtitle "Toutes vos
  // campagnes" contains "Campagnes" — an unqualified match resolves to two
  // headings (the h1 and the table's h2) and toBeVisible (strict) throws.
  await expect(page.getByRole('heading', { name: 'Campagnes', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Rex Club — Été' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Badaboum — Été' })).toBeVisible();
  await expect(page.getByText('Inactive', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Rex Club — Été' }).click();
  await expect(page).toHaveURL(/\/campagnes\/demo-rex-club/);
});

test('le détail montre le QR, les KPI, le parcours et les contacts', async ({ page }) => {
  await page.goto('/campagnes/demo-rex-club');

  await expect(page.getByRole('heading', { level: 1, name: 'Rex Club — Été' })).toBeVisible();

  // The QR's accessible name IS the URL it encodes — the assertion that the
  // preview matches what is printed on the cover.
  await expect(page.getByRole('img', { name: /QR code de la campagne : https?:\/\/.+\/s\/demo-rex-club/ })).toBeVisible();

  await expect(page.getByTestId('kpi-grid').getByText('Personnes touchées', { exact: true })).toBeVisible();
  await expect(page.getByTestId('kpi-grid').getByText('Coût par contact')).toHaveCount(0);

  await expect(page.getByTestId('funnel')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Contacts captés' })).toBeVisible();
});

test('un slug inconnu montre « Campagne introuvable », jamais « Accès refusé »', async ({ page }) => {
  await page.goto('/campagnes/cette-campagne-nexiste-pas');

  // Deliberately not asserting response.status(). Next.js commits a 200 when an
  // ancestor Suspense boundary flushes the shell before notFound() throws, so the
  // status is 200 even though the 404 page renders. What spec §6 actually
  // requires is what the CLIENT sees: the campaign-not-found screen, and never
  // the alarming « Accès refusé », which would also sign them out.
  await expect(page.getByText('Campagne introuvable')).toBeVisible();
  await expect(page.getByText('Accès refusé')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Voir toutes vos campagnes' })).toBeVisible();
});

test('la période survit à l’aller-retour liste → détail → liste', async ({ page }) => {
  // The drill-down used to drop `?p=`, so a sponsor reading 90 days landed on
  // the detail page's default 30 and every KPI changed under them. Both
  // directions are asserted: the back link dropped it too.
  await page.goto('/campagnes?p=90j');

  await page.getByRole('link', { name: 'Rex Club — Été' }).click();
  await expect(page).toHaveURL(/\/campagnes\/demo-rex-club\?p=90j/);

  await page.getByRole('link', { name: 'Toutes vos campagnes' }).click();
  await expect(page).toHaveURL(/\/campagnes\?p=90j/);
});

test('la période change les chiffres du détail', async ({ page }) => {
  await page.goto('/campagnes/demo-rex-club?p=7j');
  const sevenDays = await page.getByTestId('kpi-grid').textContent();

  await page.goto('/campagnes/demo-rex-club?p=90j');
  const ninetyDays = await page.getByTestId('kpi-grid').textContent();

  expect(sevenDays).not.toBe(ninetyDays);
});

test('l’audience montre les lieux au-dessus de la géographie', async ({ page }) => {
  await page.goto('/audience');

  await expect(page.getByRole('heading', { name: 'Lieux / événements' })).toBeVisible();
  await expect(page.getByText('Rex Club', { exact: true })).toBeVisible();

  // Task 8 removed « Lieux » from this picker and gave venues their own card
  // above. Asserting the COUNT is the point: a regression that puts venue back
  // as a fourth tab would still pass a heading-only assertion, and would silently
  // restore the mutually-exclusive behaviour spec §4.3-B rejects.
  const picker = page.getByRole('navigation', { name: 'Niveau géographique' });
  await expect(picker.getByRole('link')).toHaveCount(3);
  await expect(picker.getByRole('link', { name: 'Pays', exact: true })).toBeVisible();
  await expect(picker.getByRole('link', { name: 'Régions', exact: true })).toBeVisible();
  await expect(picker.getByRole('link', { name: 'Villes', exact: true })).toBeVisible();
  await expect(picker.getByRole('link', { name: 'Lieux', exact: true })).toHaveCount(0);

  // ?geo=venue was a valid URL in stage 3A. It must degrade, not break.
  await page.goto('/audience?geo=venue');
  await expect(page.getByRole('heading', { name: 'Où' })).toBeVisible();
});
