import { describe, expect, it } from 'vitest';
import { isPublicRoute, resolveRedirect, type AuthState } from '@/lib/auth/routes';

const anon: AuthState = { signedIn: false, hasActiveAccount: false, mustChangePassword: false };
const noAccount: AuthState = { signedIn: true, hasActiveAccount: false, mustChangePassword: false };
const mustChange: AuthState = { signedIn: true, hasActiveAccount: true, mustChangePassword: true };
const ok: AuthState = { signedIn: true, hasActiveAccount: true, mustChangePassword: false };

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
});

describe('resolveRedirect', () => {
  it('sends an anonymous visitor on a private route to /login', () => {
    expect(resolveRedirect(anon, '/')).toBe('/login');
    expect(resolveRedirect(anon, '/audience')).toBe('/login');
  });

  it('lets an anonymous visitor sit on /login', () => {
    expect(resolveRedirect(anon, '/login')).toBeNull();
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
