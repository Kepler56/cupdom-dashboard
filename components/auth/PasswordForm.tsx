'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

export const MIN_PASSWORD_LENGTH = 10;

/**
 * Forced change of the temporary password issued by the Cupdom team.
 *
 * The flag is cleared through client_mark_password_changed() — the only route
 * available, because client_accounts deliberately carries no client UPDATE
 * policy. It runs strictly AFTER the password change succeeds: clearing it
 * first would strand a client holding a temporary password with no screen
 * left to change it.
 */
export function PasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      setError('Impossible d’enregistrer ce mot de passe. Réessayez.');
      setBusy(false);
      return;
    }

    await supabase.rpc('client_mark_password_changed');
    router.replace('/');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
    </form>
  );
}
