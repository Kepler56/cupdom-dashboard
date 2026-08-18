'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

/**
 * Sign-in form. Every failure renders the SAME message: a distinct "unknown
 * address" error would let anyone probe which sponsors have portal accounts.
 */
export function LoginForm({ signOutFirst = false }: { signOutFirst?: boolean }) {
  const router = useRouter();

  // A user bounced for having no portal account still holds a valid session.
  // Clear it so they are not left in a half-authenticated state. Not a security
  // measure — RLS already grants them nothing — but leaving a dead session
  // around causes confusing behaviour on the next visit.
  useEffect(() => {
    if (signOutFirst) void createBrowserClient().auth.signOut();
  }, [signOutFirst]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError('E-mail ou mot de passe incorrect.');
      setBusy(false);
      return;
    }

    router.replace('/');
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-text">Adresse e-mail</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-[var(--radius-pill)] border border-border bg-surface px-4 py-2.5 text-text outline-none focus:border-ink"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-text">Mot de passe</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
        {busy ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  );
}
