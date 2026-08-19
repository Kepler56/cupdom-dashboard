import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

const EMAIL = 'portail-e2e-ok@cupdom-test.invalid';
const PASSWORD = process.env.E2E_PASSWORD_OK;

test.beforeEach(async ({ page }) => {
  test.skip(!PASSWORD, 'E2E_PASSWORD_OK not set — create the settled portal account first');
  await signIn(page, EMAIL, PASSWORD!, /\/$/);
  await page.goto('/audience');
});

test('the three sections render', async ({ page }) => {
  // `exact: true` throughout: Playwright's getByText defaults to substring
  // matching, and « Où » is a substring of several French words on this page.
  await expect(page.getByRole('heading', { name: 'Audience' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Où', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Quand', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Comment', exact: true })).toBeVisible();
});

test('the heatmap is a navigable table of 7 rows', async ({ page }) => {
  const heatmap = page.getByTestId('heatmap');
  await expect(heatmap.getByRole('table')).toBeVisible();
  await expect(heatmap.getByRole('rowheader')).toHaveCount(7);
});

test('the geography level lives in the URL and keeps the period', async ({ page }) => {
  await page.goto('/audience?p=7j');
  await page.getByRole('link', { name: 'Pays', exact: true }).click();
  await expect(page).toHaveURL(/geo=country/);
  await expect(page).toHaveURL(/p=7j/);
});
