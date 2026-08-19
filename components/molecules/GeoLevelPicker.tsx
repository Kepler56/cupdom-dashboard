'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { GeoLevel } from '@/lib/analytics/geo';

/**
 * Links rather than buttons, for the same reason as the period picker: the
 * level changes what is FETCHED, so it belongs in the URL — shareable,
 * bookmarkable, server-rendered, no client state to fall out of sync.
 */
export function GeoLevelPicker({
  levels,
  current,
}: {
  levels: readonly { id: GeoLevel; label: string }[];
  current: GeoLevel;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  function hrefFor(level: GeoLevel) {
    const next = new URLSearchParams(params.toString());
    next.set('geo', level);
    return `${pathname}?${next.toString()}`;
  }

  return (
    <nav aria-label="Niveau géographique" className="inline-flex gap-1 rounded-[var(--radius-pill)] border border-border bg-canvas p-1">
      {levels.map((level) => {
        const active = level.id === current;
        return (
          <Link
            key={level.id}
            href={hrefFor(level.id)}
            aria-current={active ? 'true' : undefined}
            className={[
              'rounded-[var(--radius-pill)] px-3 py-1.5 text-sm transition-colors',
              active ? 'bg-surface font-medium text-ink' : 'text-text-muted hover:text-text',
            ].join(' ')}
          >
            {level.label}
          </Link>
        );
      })}
    </nav>
  );
}
