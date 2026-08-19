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
  timeout: 60_000,
  // `expect` defaults to 5s, which is shorter than a cold Next.js dev compile:
  // the first test to hit a route routinely waits 7-22s while the route builds,
  // and the resulting failure looks exactly like a broken redirect. Raised so a
  // timeout means something is actually wrong.
  expect: { timeout: 20_000 },
  use: { baseURL: `http://localhost:${PORT}` },
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
