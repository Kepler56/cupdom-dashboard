import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { isPublicRoute, LOGIN_ROUTE } from '@/lib/auth/routes';

/** The request header carrying the pathname through to the portal layout. */
export const PATHNAME_HEADER = 'x-pathname';

/**
 * Session refresh + the unauthenticated redirect, nothing more.
 *
 * The account check (does a client_accounts row exist and is it active?) runs
 * in the portal layout, not here — putting a database query in middleware
 * costs a round-trip on every request including assets.
 *
 * This is convenience. RLS and the RPC guards are the security boundary.
 *
 * The pathname is forwarded as a REQUEST header, because that is the only thing
 * a Server Component's `headers()` can read. Setting it on the response would
 * compile, run, and do nothing: the layout would read null, fall back to '/',
 * and the sidebar would mark "Vue d'ensemble" active on every single page.
 * Locked by tests/unit/middlewarePathname.test.ts.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, signedIn } = await updateSession(request, {
    [PATHNAME_HEADER]: pathname,
  });

  if (!signedIn && !isPublicRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_ROUTE;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
