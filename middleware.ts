import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { isPublicRoute, LOGIN_ROUTE } from '@/lib/auth/routes';

/**
 * Session refresh + the unauthenticated redirect, nothing more.
 *
 * The account check (does a client_accounts row exist and is it active?) runs
 * in the portal layout, not here — putting a database query in middleware
 * costs a round-trip on every request including assets.
 *
 * This is convenience. RLS and the RPC guards are the security boundary.
 */
export async function middleware(request: NextRequest) {
  const { response, signedIn } = await updateSession(request);
  const { pathname } = request.nextUrl;

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
