'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { MIN_PASSWORD_LENGTH } from './PasswordForm';

/**
 * Voluntary password change, from « Mon compte » (spec §4.3-E).
 *
 * Distinct from `PasswordForm`, which serves the FORCED change: that one runs
 * when the client still holds the temporary password the team issued, so it
 * clears `must_change_password` afterwards and sends them on to the dashboard.
 * Neither applies here, and a redirect away from the page they were reading
 * would be a bug rather than a courtesy.
 *
 * The difference that matters is the current-password field. Supabase will
 * change a password for anyone holding a live session, so without this a laptop
 * left open is enough to lock the real sponsor out of the portal that displays
 * their captured contacts. Re-authenticating first turns « whoever has this
 * tab » into « whoever knows the password ».
 *
 * Both passwords here are plaintext and neither is ever logged, echoed into an
 * error, or put in a URL. The Supabase error text is deliberately discarded: it
 * is English, and it describes our auth provider's rules rather than the
 * client's situation.
 */
export function AccountPasswordForm({ email }: { email: string }) {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);

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

    // Prove it is really them, BEFORE anything changes. A failed attempt leaves
    // the existing session untouched.
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password: current });
    if (authError) {
      setError('Votre mot de passe actuel est incorrect.');
      setBusy(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError('Impossible d’enregistrer ce mot de passe. Réessayez.');
      setBusy(false);
      return;
    }

    setCurrent('');
    setPassword('');
    setConfirm('');
    setDone(true);
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-sm flex-col gap-4">
      <Field id="current" label="Mot de passe actuel" autoComplete="current-password" value={current} onChange={setCurrent} />
      <Field id="password" label="Nouveau mot de passe" autoComplete="new-password" value={password} onChange={setPassword} />
      <Field id="confirm" label="Confirmer le nouveau mot de passe" autoComplete="new-password" value={confirm} onChange={setConfirm} />

      {error && (
        <p role="alert" className="rounded-[var(--radius-pill)] bg-[#FEF3F2] px-4 py-2 text-sm text-[#B42318]">
          {error}
        </p>
      )}

      {done && (
        <p role="status" className="rounded-[var(--radius-pill)] bg-canvas px-4 py-2 text-sm text-text-body">
          Votre mot de passe a été changé.
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="rounded-[var(--radius-pill)] bg-ink px-4 py-2.5 font-medium text-white disabled:opacity-60"
      >
        {busy ? 'Enregistrement…' : 'Changer le mot de passe'}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  autoComplete,
  value,
  onChange,
}: {
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      <input
        id={id}
        type="password"
        autoComplete={autoComplete}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[var(--radius-pill)] border border-border bg-surface px-4 py-2.5 text-text outline-none focus:border-ink"
      />
    </div>
  );
}
