import type { NextConfig } from 'next';

/**
 * Security headers, defined HERE rather than only in netlify.toml.
 *
 * WHY: verified against cupdom's live deploy on 2026-08-23 — the `[[headers]]` block
 * in netlify.toml was NOT reaching any page response. Every route returned 200 with
 * no Content-Security-Policy, no X-Frame-Options, no Referrer-Policy and no
 * Permissions-Policy; only Netlify's own defaults were present.
 *
 * With @netlify/plugin-nextjs v5 every route is served through the Next.js handler,
 * so CDN-level header injection from netlify.toml does not apply to it. Next applies
 * these itself, to its own responses.
 *
 * This repo's netlify.toml was added the same day and would have shipped exactly the
 * same non-functioning headers, so it is fixed here before it ever had a chance to
 * look like it was working.
 *
 * Deliberately STRICTER than cupdom's: the portal has no CDN dependency, so
 * cdn.jsdelivr.net is not allow-listed. next/font/google self-hosts at build time,
 * so `font-src 'self'` is sufficient and no external font origin is needed —
 * confirmed by grepping the source for external URLs before writing this.
 *
 * KEEP IN SYNC with netlify.toml. If the two ever diverge and both apply, a browser
 * intersects multiple CSP headers and takes the STRICTEST, so a directive missing
 * here would silently override the one there.
 */
/**
 * 'unsafe-eval' is added to script-src in DEVELOPMENT ONLY.
 *
 * WHY: `next dev` bundles every module through webpack's eval-based devtool, so under a
 * policy without 'unsafe-eval' the browser refuses them — "Uncaught EvalError: unsafe-eval
 * is not an allowed source of script". React then never hydrates, the login form falls back
 * to a native HTML submit, and `pnpm test:e2e` failed 32 of 37 specs on 2026-08-26 against
 * a production build that is perfectly healthy.
 *
 * `next build` emits no eval, so PRODUCTION KEEPS THE STRICT POLICY. netlify.toml serves
 * production traffic only: the KEEP-IN-SYNC rule above covers the production directives and
 * must NOT be read as licence to copy 'unsafe-eval' over there.
 */
export function buildCsp(isDev: boolean): string {
  return [
    "default-src 'self'",
    // Required by Next's inline hydration scripts; a strict policy would need
    // per-request nonces from the framework.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    // The one that matters most here: this is an authenticated dashboard and must
    // never be embeddable.
    "frame-ancestors 'none'",
  ].join('; ');
}

const CSP = buildCsp(process.env.NODE_ENV !== 'production');

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
