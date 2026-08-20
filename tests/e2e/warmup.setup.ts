import { test as setup } from '@playwright/test';
import { signIn } from './helpers';

const OK_EMAIL = 'portail-e2e-ok@cupdom-test.invalid';
const TEMP_EMAIL = 'portail-e2e@cupdom-test.invalid';

/**
 * Compile every route once, serially, before any test's clock starts.
 *
 * The defect this exists for: the documented release gate — `rm -rf .next &&
 * pnpm build && pnpm test:e2e` — failed reproducibly on green code. Four
 * workers each opened a different spec file at the same instant against a dev
 * server with nothing compiled, so four route trees compiled at once while four
 * `signIn` calls counted down a 20 s budget. The first test of every file
 * failed, still sitting on /login, and a gate that fails on working code is a
 * signal nobody can read.
 *
 * A warm cache hid it and a serial run hid it, which is exactly what made it
 * survive two rounds of « it passed when I re-ran it ».
 *
 * The fix is to pay the compile ONCE, here, where it is not competing with an
 * assertion. Playwright runs this as a `dependencies` project, so it is
 * guaranteed to finish — after the webServer is up — before the first real test
 * starts.
 *
 * Two rules this file must keep:
 *
 * 1. **It may never fail the run.** A warm-up is an optimisation, not a check.
 *    If it threw on bad credentials, every real test would be SKIPPED rather
 *    than failing with its own message, and the suite would lose the diagnostic
 *    that helpers.ts was written to provide. So it warns and returns.
 * 2. **It asserts nothing.** Anything worth asserting belongs in a spec file
 *    where a failure names the behaviour that broke.
 *
 * Routes are visited unauthenticated only where the middleware allows it: every
 * portal path redirects to /login without a session, so warming those requires
 * signing in.
 */
setup('précompiler chaque route avant la première assertion', async ({ page }) => {
  // Generous on purpose: this is the one place where a genuinely cold compile
  // of the whole app happens, and it must not be the thing that times out.
  setup.setTimeout(300_000);

  const warn = (route: string, error: unknown) =>
    console.warn(`[warmup] ${route} non préchauffé:`, error instanceof Error ? error.message : error);

  // The public shell first — login is what every worker hits before anything.
  for (const route of ['/login', '/nexiste-pas']) {
    try {
      await page.goto(route);
    } catch (error) {
      warn(route, error);
    }
  }

  // The forced-password-change screen, reachable only as that account.
  if (process.env.E2E_PASSWORD) {
    try {
      await signIn(page, TEMP_EMAIL, process.env.E2E_PASSWORD, /\/mot-de-passe$/);
    } catch (error) {
      warn('/mot-de-passe', error);
    }
    await page.context().clearCookies();
  }

  if (!process.env.E2E_PASSWORD_OK) return;

  try {
    await signIn(page, OK_EMAIL, process.env.E2E_PASSWORD_OK, /\/$/);
  } catch (error) {
    warn('/', error);
    return;
  }

  // Every portal route a spec file opens, including the two 404 paths — the
  // not-found boundary is a compile of its own.
  for (const route of [
    '/audience',
    '/campagnes',
    '/campagnes/demo-rex-club',
    '/campagnes/cette-campagne-nexiste-pas',
  ]) {
    try {
      await page.goto(route);
    } catch (error) {
      warn(route, error);
    }
  }
});
