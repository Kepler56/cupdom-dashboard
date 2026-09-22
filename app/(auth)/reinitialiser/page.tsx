'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { MIN_PASSWORD_LENGTH } from '@/components/auth/PasswordForm';

/**
 * Password-reset landing (« Mot de passe oublié ? » from the login page).
 *
 * The emailed recovery link carries a code in the URL. @supabase/ssr's browser
 * client exchanges it for a session on load (detectSessionInUrl, on by default)
 * and fires PASSWORD_RECOVERY / SIGNED_IN — so we wait for that before showing
 * the form rather than assume a session is already there. Until it lands, the
 * screen says it is checking the link, not that anything is wrong.
 *
 * This route is public (routes.ts RESET_ROUTE): the code is exchanged in the
 * browser, AFTER the middleware has run, so the first request arrives with no
 * session cookie and a gated route would bounce it to /login and drop the code.
 *
 * The 10-character floor is shared with the forced-change PasswordForm so the
 * two password screens never disagree on what is acceptable.
 */
export default function ReinitialiserPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    // If the code was already exchanged (e.g. a reload of this page), the event
    // above has fired and gone; fall back to reading the session directly.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Votre mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.`);
      return;
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setBusy(true);
    const supabase = createBrowserClient();

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError('Impossible d’enregistrer ce mot de passe. Le lien a peut-être expiré.');
      setBusy(false);
      return;
    }

    // Clear must_change_password if it was still set: a client who never made
    // their first login but used « mot de passe oublié » has now chosen a real
    // password, and should not be pinned to the forced-change screen afterwards.
    // Fire-and-forget and awaited (postgrest-js builders are lazy thenables): a
    // failure here must not block a password that already changed.
    await supabase.rpc('client_mark_password_changed').then(
      () => {},
      () => {},
    );

    router.replace('/');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-text">Nouveau mot de passe</h1>
        <p className="mt-1 text-sm text-text-muted">
          Choisissez un mot de passe d’au moins {MIN_PASSWORD_LENGTH} caractères.
        </p>
      </div>

      {!ready ? (
        <p className="text-sm text-text-muted">Vérification du lien…</p>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-text">Nouveau mot de passe</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-[var(--radius-pill)] border border-border bg-surface px-4 py-2.5 text-text outline-none focus:border-ink"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm" className="text-sm font-medium text-text">Confirmer le mot de passe</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="rounded-[var(--radius-pill)] border border-border bg-surface px-4 py-2.5 text-text outline-none focus:border-ink"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-[var(--radius-pill)] bg-[#FEF3F2] px-4 py-2 text-sm text-[#B42318]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="rounded-[var(--radius-pill)] bg-ink px-4 py-2.5 font-medium text-white disabled:opacity-60"
          >
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </>
      )}
    </form>
  );
}
