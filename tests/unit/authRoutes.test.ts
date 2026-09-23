import { describe, expect, it } from 'vitest';
import { isPublicRoute, resolveRedirect, type AuthState } from '@/lib/auth/routes';

const anon: AuthState = { signedIn: false, hasActiveAccount: false, mustChangePassword: false };
const noAccount: AuthState = { signedIn: true, hasActiveAccount: false, mustChangePassword: false };
const mustChange: AuthState = { signedIn: true, hasActiveAccount: true, mustChangePassword: true };
const ok: AuthState = { signedIn: true, hasActiveAccount: true, mustChangePassword: false };
// A Cupdom member (#4): signed in, no client_accounts row, but isMember.
const member: AuthState = { signedIn: true, hasActiveAccount: false, mustChangePassword: false, isMember: true };

describe('isPublicRoute', () => {
  it('treats the login page as public', () => {
    expect(isPublicRoute('/login')).toBe(true);
  });

  it('treats the portal as private', () => {
    expect(isPublicRoute('/')).toBe(false);
    expect(isPublicRoute('/audience')).toBe(false);
    expect(isPublicRoute('/campagnes/abc123')).toBe(false);
  });

  it('does NOT treat the password-change page as public — it requires a session', () => {
    expect(isPublicRoute('/mot-de-passe')).toBe(false);
  });

  it('treats the password-reset landing as public — the recovery link lands with no session yet', () => {
    // The code in the emailed link is exchanged client-side, after middleware
    // has run, so the first request has no session cookie. A gated route would
    // bounce it to /login and drop the code before it could be exchanged.
    expect(isPublicRoute('/reinitialiser')).toBe(true);
  });
});

describe('resolveRedirect', () => {
  it('sends an anonymous visitor on a private route to /login', () => {
    expect(resolveRedirect(anon, '/')).toBe('/login');
    expect(resolveRedirect(anon, '/audience')).toBe('/login');
  });

  it('lets an anonymous visitor sit on /login', () => {
    expect(resolveRedirect(anon, '/login')).toBeNull();
  });

  it('lets an anonymous visitor onto the password-reset landing', () => {
    // Before the recovery code is exchanged the visitor has no session; the
    // page must load so the browser client can do the exchange.
    expect(resolveRedirect(anon, '/reinitialiser')).toBeNull();
  });

  it('lets a recovery session (already signed in) stay on the reset page', () => {
    // Once the code is exchanged the visitor is signed in; they must not be
    // bounced to home before they have set the new password.
    expect(resolveRedirect(ok, '/reinitialiser')).toBeNull();
  });

  it('sends a signed-in user with no portal account to /login with an explicit reason', () => {
    // A CRM member, or a deactivated client. They must not see an empty
    // dashboard — that reads as "you have no data" rather than "no access"
    // (spec §6). The ?erreur=acces param lets the login page say so.
    expect(resolveRedirect(noAccount, '/')).toBe('/login?erreur=acces');
  });

  it('does NOT loop when a user with no account is already on /login', () => {
    // Returning the login route unconditionally here is an infinite redirect.
    expect(resolveRedirect(noAccount, '/login')).toBeNull();
  });

  it('lets a Cupdom member (no client account) INTO the portal (#4)', () => {
    // A member has no client_accounts row but may view clients via the picker.
    expect(resolveRedirect(member, '/')).toBeNull();
    expect(resolveRedirect(member, '/campagnes')).toBeNull();
    expect(resolveRedirect(member, '/audience')).toBeNull();
  });

  it('keeps a signed-in member off the auth pages', () => {
    expect(resolveRedirect(member, '/login')).toBe('/');
    expect(resolveRedirect(member, '/mot-de-passe')).toBe('/');
  });

  it('still bounces a non-member with no account (deactivated / stranger) to login', () => {
    // The member branch must not weaken the access denial for everyone else.
    expect(resolveRedirect(noAccount, '/')).toBe('/login?erreur=acces');
  });

  it('forces an unchanged temporary password to /mot-de-passe from anywhere', () => {
    expect(resolveRedirect(mustChange, '/')).toBe('/mot-de-passe');
    expect(resolveRedirect(mustChange, '/audience')).toBe('/mot-de-passe');
  });

  it('does not redirect the password page onto itself', () => {
    expect(resolveRedirect(mustChange, '/mot-de-passe')).toBeNull();
  });

  it('sends a fully authenticated client away from /login to the dashboard', () => {
    expect(resolveRedirect(ok, '/login')).toBe('/');
  });

  it('sends a client who no longer needs to change their password away from that page', () => {
    expect(resolveRedirect(ok, '/mot-de-passe')).toBe('/');
  });

  it('allows a fully authenticated client through to any portal route', () => {
    expect(resolveRedirect(ok, '/')).toBeNull();
    expect(resolveRedirect(ok, '/campagnes/abc123')).toBeNull();
  });
});
