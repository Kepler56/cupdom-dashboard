/**
 * PURE auth routing decisions. No Supabase import, no Next import, no I/O.
 *
 * Both the middleware and the portal layout call these, so the two can never
 * disagree about who is allowed where. Being pure, every branch is covered by
 * unit tests without a browser, a database or a running server.
 *
 * This is CONVENIENCE, not security. The real boundary is Postgres RLS and the
 * SECURITY DEFINER RPC guards — a client who defeated every check here would
 * still read nothing.
 */
export interface AuthState {
  signedIn: boolean;
  /** A client_accounts row exists for this user AND active = true. */
  hasActiveAccount: boolean;
  mustChangePassword: boolean;
}

export const LOGIN_ROUTE = '/login';
export const PASSWORD_ROUTE = '/mot-de-passe';
export const HOME_ROUTE = '/';
/** Login, flagged so the page can explain WHY the user was sent back (spec §5.8). */
export const LOGIN_NO_ACCESS_ROUTE = '/login?erreur=acces';

/** Only the login page is reachable without a session. */
export function isPublicRoute(pathname: string): boolean {
  return pathname === LOGIN_ROUTE;
}

/**
 * The destination this request should be sent to, or null to let it through.
 * Order matters: each rule assumes the ones above it have already passed.
 */
export function resolveRedirect(state: AuthState, pathname: string): string | null {
  // 1. No session: only the login page is allowed.
  if (!state.signedIn) {
    return isPublicRoute(pathname) ? null : LOGIN_ROUTE;
  }

  // 2. Signed in but not an active portal client — a CRM member, or a
  //    deactivated account. Back to login, flagged so the page can say why.
  //    Deliberately NOT an empty dashboard: "you have no access" and "you have
  //    no data" are different things and must look different (spec §6).
  //    The pathname guard is load-bearing — returning the login route
  //    unconditionally would redirect /login to itself, forever.
  if (!state.hasActiveAccount) {
    return pathname === LOGIN_ROUTE ? null : LOGIN_NO_ACCESS_ROUTE;
  }

  // 3. Temporary password not yet changed: pin them to the password page.
  if (state.mustChangePassword) {
    return pathname === PASSWORD_ROUTE ? null : PASSWORD_ROUTE;
  }

  // 4. Fully authenticated: keep them off the auth pages.
  if (pathname === LOGIN_ROUTE || pathname === PASSWORD_ROUTE) {
    return HOME_ROUTE;
  }

  return null;
}
