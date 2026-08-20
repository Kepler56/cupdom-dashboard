import { defineConfig } from '@playwright/test';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

// Playwright does not auto-load .env files; load .env.local for the E2E creds.
const envFile = path.resolve(__dirname, '.env.local');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

/**
 * NOT port 3000. Another project on this machine already listens there, and
 * with reuseExistingServer:true Playwright happily ran the whole suite against
 * it — reporting assertion failures against a foreign app rather than saying
 * "wrong server". reuseExistingServer:false makes a port clash fail loudly
 * instead of testing the wrong thing.
 */
const PORT = 3210;

export default defineConfig({
  testDir: './tests/e2e',
  // 90s, not 60s. A test that has to absorb a first compile can legitimately
  // spend most of a minute inside signIn (see SIGN_IN_TIMEOUT in
  // tests/e2e/helpers.ts); at 60s the test timeout would fire first and report
  // « Test timeout exceeded » instead of the sign-in diagnostic that helper
  // exists to produce.
  timeout: 90_000,
  // `expect` defaults to 5s, which is shorter than a cold Next.js dev compile:
  // the first test to hit a route routinely waits 7-22s while the route builds,
  // and the resulting failure looks exactly like a broken redirect. Raised so a
  // timeout means something is actually wrong.
  expect: { timeout: 20_000 },
  use: { baseURL: `http://localhost:${PORT}` },
  /**
   * A setup project, not a bare test file.
   *
   * The documented gate — `rm -rf .next && pnpm build && pnpm test:e2e` — failed
   * reproducibly on green code: with nothing compiled, the default four workers
   * opened four spec files at the same instant, four route trees compiled at
   * once on one dev server, and the first test of every file timed out inside
   * signIn still sitting on /login. A warm cache passed and a serial run passed,
   * which is what let it survive two rounds of « it passed when I re-ran it ».
   *
   * `dependencies` is the ordering guarantee: the warm-up runs after the
   * webServer is up and finishes before the first real test starts, so the
   * compile is paid once and outside every assertion budget. It is deliberately
   * incapable of failing the run — see warmup.setup.ts.
   *
   * Reducing the worker count would also have hidden the symptom, at the cost of
   * halving the suite for every run forever, and would have left the real
   * problem — a first compile charged to a test's clock — in place for the next
   * route anyone adds.
   */
  projects: [
    { name: 'warmup', testMatch: /warmup\.setup\.ts$/ },
    { name: 'portail', testIgnore: /warmup\.setup\.ts$/, dependencies: ['warmup'] },
  ],
  webServer: {
    // The node binary rather than `pnpm dev`: on Windows pnpm is a .cmd/.ps1
    // shim, and spawning it from Playwright is unreliable. Same server, one
    // fewer moving part.
    command: `node node_modules/next/dist/bin/next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
