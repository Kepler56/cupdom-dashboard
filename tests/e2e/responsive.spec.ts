import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers';

const EMAIL = 'portail-e2e-ok@cupdom-test.invalid';
const PASSWORD = process.env.E2E_PASSWORD_OK;

/**
 * The portal is read on phones and tablets far more than on a desktop, so the
 * layout has to survive those widths — this file is the guard on that.
 *
 * The assertion that matters is horizontal overflow of the PAGE. A table that
 * scrolls sideways inside its own `overflow-x-auto` box is correct and expected;
 * a page whose <body> is wider than the viewport is the bug — it drags the
 * header, the KPI tiles and the nav off-screen together, and there is no way for
 * a reader to tell that from "the site is broken". Tables therefore get their
 * own targeted check (the scroller is wider than its container, the page is not).
 */
const WIDTHS = [
  { name: 'iPhone 14', width: 390, height: 844 },
  { name: 'tablette portrait', width: 820, height: 1180 },
  { name: 'bureau', width: 1440, height: 900 },
];

const ROUTES = ['/', '/audience', '/campagnes', '/contacts', '/compte'];

/** The page itself must never scroll sideways, whatever a table inside it does. */
async function expectNoPageOverflow(page: Page, where: string) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    overflow.scrollWidth,
    `${where} déborde horizontalement : ${overflow.scrollWidth}px de contenu pour ${overflow.clientWidth}px de fenêtre`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1); // +1 absorbs sub-pixel rounding
}

/**
 * The one route reachable without a session, so the one responsive check that
 * runs even when the portal test accounts are not available.
 */
for (const viewport of WIDTHS) {
  test(`la page de connexion tient dans ${viewport.name} (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1, name: 'Votre portail.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
    await expectNoPageOverflow(page, `/login en ${viewport.name}`);
  });
}

test.describe('portail authentifié', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!PASSWORD, 'E2E_PASSWORD_OK not set — create the settled portal account first');
  });

  for (const viewport of WIDTHS) {
    test(`aucun débordement horizontal en ${viewport.name} (${viewport.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await signIn(page, EMAIL, PASSWORD!, /\/$/);

      for (const route of ROUTES) {
        await page.goto(route);
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
        await expectNoPageOverflow(page, `${route} en ${viewport.name}`);
      }
    });
  }

  test('sur téléphone la navigation passe par le tiroir, pas par la colonne fixe', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, EMAIL, PASSWORD!, /\/$/);

    // The 240 px column would eat 60 % of this screen, so it must be gone…
    const desktopNav = page.getByRole('link', { name: 'Contacts captés', exact: true });
    await expect(desktopNav).toBeHidden();

    // …and reachable through the drawer instead.
    const trigger = page.getByRole('button', { name: 'Ouvrir le menu' });
    await expect(trigger).toBeVisible();
    await trigger.click();

    await expect(page.getByRole('link', { name: 'Contacts captés', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Contacts captés', exact: true }).click();
    await expect(page).toHaveURL(/\/contacts/);

    // Navigating closes it: the drawer is fixed-position, so a drawer left open
    // sits on top of the page the client just asked for.
    await expect(page.getByRole('button', { name: 'Fermer le menu' })).toBeHidden();
  });

  test('sur bureau la colonne de navigation reste visible et le tiroir disparaît', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page, EMAIL, PASSWORD!, /\/$/);

    await expect(page.getByRole('link', { name: 'Contacts captés', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ouvrir le menu' })).toBeHidden();
  });

  test('sur téléphone le tableau des contacts défile sans emporter la page', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, EMAIL, PASSWORD!, /\/$/);
    await page.goto('/contacts');

    const table = page.getByRole('table');
    test.skip((await table.count()) === 0, 'compte de démonstration sans contacts');

    // The scroller is allowed — encouraged, even — to be wider than the screen.
    const scroller = table.locator('xpath=ancestor::div[1]');
    const box = await scroller.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(box.scroll).toBeGreaterThan(box.client);

    // The page is not.
    await expectNoPageOverflow(page, '/contacts en 390px');
  });
});
