/**
 * Locks the fix for a defect in the stage-2A plan.
 *
 * The plan specified `response.headers.set('x-pathname', pathname)`. That sets a
 * RESPONSE header, while a Server Component's `headers()` reads REQUEST headers.
 * The bug is invisible: it compiles, the build passes, no error is thrown — the
 * portal layout simply reads null, falls back to '/', and the sidebar marks
 * "Vue d'ensemble" active on every page forever.
 *
 * `NextResponse.next({ request: { headers } })` encodes forwarded request
 * headers onto the response as `x-middleware-request-<name>`, listed in
 * `x-middleware-override-headers`. Asserting on that encoding is what
 * distinguishes a forwarded REQUEST header from a plain response header — the
 * exact confusion this test exists to catch.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getUser = vi.fn();
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser } }),
}));

beforeEach(() => {
  getUser.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
});

const OVERRIDE_LIST = 'x-middleware-override-headers';
const forwarded = (name: string) => `x-middleware-request-${name}`;

describe('middleware forwards the pathname as a REQUEST header', () => {
  it('forwards x-pathname so the portal layout can read it', async () => {
    const { middleware, PATHNAME_HEADER } = await import('@/middleware');
    const res = await middleware(new NextRequest('http://localhost:3000/audience'));

    // The header must be in the forwarded-request set, not merely on the response.
    expect(res.headers.get(OVERRIDE_LIST)).toContain(PATHNAME_HEADER);
    expect(res.headers.get(forwarded(PATHNAME_HEADER))).toBe('/audience');
  });

  it('forwards the real pathname for a nested route, not a fallback', async () => {
    const { middleware, PATHNAME_HEADER } = await import('@/middleware');
    const res = await middleware(new NextRequest('http://localhost:3000/campagnes/abc123'));
    expect(res.headers.get(forwarded(PATHNAME_HEADER))).toBe('/campagnes/abc123');
  });

  it('does not lose the pathname on the root route', async () => {
    const { middleware, PATHNAME_HEADER } = await import('@/middleware');
    const res = await middleware(new NextRequest('http://localhost:3000/'));
    expect(res.headers.get(forwarded(PATHNAME_HEADER))).toBe('/');
  });

  it('still redirects an anonymous visitor away from a private route', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const { middleware } = await import('@/middleware');
    const res = await middleware(new NextRequest('http://localhost:3000/audience'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('lets an anonymous visitor reach /login', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const { middleware } = await import('@/middleware');
    const res = await middleware(new NextRequest('http://localhost:3000/login'));
    expect(res.status).toBe(200);
  });
});
