'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

/**
 * « Se déconnecter ». The portal had no way out: the session persists in cookies
 * (@supabase/ssr default) and is refreshed on every request, so a shared device
 * — or a pasted link on a machine already signed in — stayed connected with no
 * prompt. This is the control that ends the session on demand.
 *
 * A HARD navigation (`window.location`), not router.replace(), on purpose:
 *   - signOut() clears the auth cookies, but a client-side route change would
 *     keep the current React tree (rendered for the signed-in client) mounted.
 *     A full document load throws that away and re-runs the middleware gate from
 *     a clean slate, so nothing rendered for the old session lingers.
 *   - it also keeps this component free of `useRouter`, so the server-rendered
 *     Sidebar can embed it without every Sidebar test needing a router mock.
 *
 * Styled to match NavItem (same pill, same muted-to-white hover) so it reads as
 * part of the same rail rather than a bolted-on button.
 */
export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function onSignOut() {
    setBusy(true);
    try {
      await createBrowserClient().auth.signOut();
    } catch {
      // Offline, or an already-expired token. Swallowed on purpose: the session
      // is dead either way and the redirect below re-checks it. Rethrowing would
      // surface as an unhandled rejection from this click handler and change
      // nothing for the user.
    } finally {
      // Send them to login regardless — the middleware re-checks the session
      // there and a dead one grants nothing. Leaving them stuck on a
      // half-signed-out page is the worse end.
      window.location.assign('/login');
    }
  }

  return (
    <button
      type="button"
      onClick={onSignOut}
      disabled={busy}
      className="flex min-h-11 items-center gap-3 rounded-[var(--radius-pill)] px-3 py-2 text-sm text-white/60 transition-colors hover:text-white disabled:opacity-60"
    >
      <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
      <span className="flex-1 text-left">{busy ? 'Déconnexion…' : 'Se déconnecter'}</span>
    </button>
  );
}
