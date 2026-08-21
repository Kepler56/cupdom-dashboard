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

// Scoped to the KPI grid, not the page. « Personnes touchées » is a KPI label
// AND the chart's metric toggle, so an unscoped getByText matches two visible
// elements and toBeVisible — which is strict — throws. That only shows up once
// the seeded account HAS data (with none, the chart is replaced by the empty
// state and the toggle never renders), so the failure would land on whoever
// creates the accounts and read as a broken product rather than a locator bug.
test('the four KPI tiles render with French labels', async ({ page }) => {
  const kpis = page.getByTestId('kpi-grid');
  // `exact: true` is load-bearing here, not cosmetic. KpiTile renders each
  // tile's hint a second time as an sr-only <p> for screen readers, and two of
  // those hints quote other tiles' labels verbatim (the "Contacts captés" hint
  // mentions "Personnes touchées", and the cost tile's hint mentions "Contacts
  // captés" too). Playwright's getByText defaults to substring matching, so
  // the unqualified form resolves to 2-3 elements and toBeVisible (strict)
  // throws. Do not remove this.
  await expect(kpis.getByText('Personnes touchées', { exact: true })).toBeVisible();
  await expect(kpis.getByText('Scans totaux', { exact: true })).toBeVisible();
  await expect(kpis.getByText('Contacts captés', { exact: true })).toBeVisible();
  await expect(kpis.getByText('Taux de captation', { exact: true })).toBeVisible();
});

test('the period selector drives the URL', async ({ page }) => {
  await page.getByRole('link', { name: '7 jours' }).click();
  await expect(page).toHaveURL(/p=7j/);
});

// Spec §4.9 — the one module that deliberately ignores the period must say so
// on screen, or the period pills imply a scope it does not have. Scoped for the
// same reason as the KPI grid: the campaigns table's subtitle also says « depuis
// le début », which is what the old `.first()` was papering over.
test('the funnel states that it covers the whole campaign', async ({ page }) => {
  await expect(page.getByTestId('funnel').getByText(/depuis le début/i)).toBeVisible();
});

test('les temps forts sont générés à partir des chiffres de la période', async ({ page }) => {
  await page.goto('/');

  const card = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Temps forts', exact: true }) });
  await expect(card).toBeVisible();

  // Assert the CARD, not a sentence. Which insights qualify depends on the
  // seeded data and on the period, so pinning « Votre pic : samedi 23 h » here
  // would make this test a check on the demo dataset rather than on the
  // feature. Either three bullets or the honest empty state is a pass; a blank
  // card is not.
  const bullets = card.getByRole('listitem');
  const count = await bullets.count();
  if (count === 0) {
    await expect(card.getByText('Pas encore assez de données')).toBeVisible();
  } else {
    expect(count).toBeLessThanOrEqual(3);
  }
});
