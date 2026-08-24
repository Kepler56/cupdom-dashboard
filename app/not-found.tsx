import Link from 'next/link';
import { EmptyState } from '@/components/molecules/EmptyState';

/**
 * The portal's floor for any URL that matches no route.
 *
 * Without this file Next.js serves its built-in page — « 404 | This page could
 * not be found. » — which is English, unstyled, and outside the portal's shell.
 * A French client-facing product cannot hand a sponsor that screen, whatever
 * produced it: a stale bookmark, a mistyped path, or a link this branch has not
 * shipped yet.
 *
 * Deliberately NOT inside app/(portal): a route group's layout only wraps the
 * routes it contains, and this one answers for paths that matched nothing at
 * all — including paths outside the portal. So no sidebar, and the way back is
 * an explicit link rather than a nav the layout would have drawn.
 *
 * The HTTP status is Next's own concern and is left alone; the campaigns 404
 * carries the same note. What matters to the client is what the screen says.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center p-4 sm:p-6">
      <div className="flex flex-col items-center gap-4">
        <EmptyState title="Page introuvable">
          Cette page n’existe pas, ou elle n’est pas encore ouverte sur votre portail.
        </EmptyState>
        <Link
          href="/"
          className="rounded-[var(--radius-pill)] bg-ink px-4 py-2 text-sm font-medium text-white"
        >
          Retour à votre portail
        </Link>
      </div>
    </main>
  );
}
