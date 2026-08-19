'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LOGIN_NO_ACCESS_ROUTE } from '@/lib/auth/routes';
import { createBrowserClient } from '@/lib/supabase/client';

/**
 * Spec §6: an RPC guard refusal clears the session and returns the user to the
 * login page, which explains why. Deliberately NOT an empty dashboard — that
 * would tell a client with a provisioning problem that their campaign flopped.
 */
export function AccessDenied() {
  const router = useRouter();

  useEffect(() => {
    void createBrowserClient()
      .auth.signOut()
      .then(() => router.replace(LOGIN_NO_ACCESS_ROUTE));
  }, [router]);

  return (
    <div role="alert" className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
      <p className="font-display text-base font-bold text-ink">Accès refusé</p>
      <p className="max-w-sm text-sm text-text-muted">Ce compte n’a pas accès au portail client. Reconnexion…</p>
    </div>
  );
}
