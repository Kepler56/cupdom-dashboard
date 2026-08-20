import Link from 'next/link';
import { EmptyState } from '@/components/molecules/EmptyState';

/**
 * Spec §6: an unknown or foreign slug returns 404, not « Accès refusé ».
 *
 * The difference matters commercially. A refusal screen tells the sponsor they
 * have been locked out of something that exists — alarming, and false. This says
 * the page is not there and points at the list, which is what a stale bookmark
 * or a typo actually needs.
 */
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        <EmptyState title="Campagne introuvable">
          Cette campagne n’existe pas, ou elle ne fait pas partie des vôtres.
        </EmptyState>
        <Link
          href="/campagnes"
          className="rounded-[var(--radius-pill)] bg-ink px-4 py-2 text-sm font-medium text-white"
        >
          Voir toutes vos campagnes
        </Link>
      </div>
    </main>
  );
}
