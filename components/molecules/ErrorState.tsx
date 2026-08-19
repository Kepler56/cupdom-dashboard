'use client';

import { useRouter } from 'next/navigation';

/**
 * Spec §6: a failed read never becomes a zero. The client sees that something
 * broke and gets a way to try again — a silent empty dashboard would be read as
 * "your campaign produced nothing", which is a far more expensive lie.
 */
export function ErrorState({ message }: { message: string }) {
  const router = useRouter();

  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
      <p className="font-display text-base font-bold text-ink">Chargement impossible</p>
      <p className="max-w-sm text-sm text-text-muted">{message}</p>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="rounded-[var(--radius-pill)] bg-ink px-4 py-2 text-sm font-medium text-white"
      >
        Réessayer
      </button>
    </div>
  );
}
