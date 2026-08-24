'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { PERIOD_PRESETS, type PeriodPreset } from '@/lib/period';

/**
 * Period control. Renders links rather than buttons so the period lives in the
 * URL — shareable, bookmarkable, server-rendered, and with no client state to
 * fall out of sync. Other parameters (notably the campaign filter) are
 * preserved, so changing period never silently drops the user's scope.
 */
export function PeriodPicker({ current }: { current: PeriodPreset }) {
  const pathname = usePathname();
  const params = useSearchParams();

  function hrefFor(preset: PeriodPreset) {
    const next = new URLSearchParams(params.toString());
    next.set('p', preset);
    return `${pathname}?${next.toString()}`;
  }

  return (
    <nav aria-label="Période" className="inline-flex shrink-0 gap-1 rounded-[var(--radius-pill)] border border-border bg-surface p-1">
      {PERIOD_PRESETS.map((preset) => {
        const active = preset.id === current;
        return (
          <Link
            key={preset.id}
            href={hrefFor(preset.id)}
            aria-current={active ? 'true' : undefined}
            className={[
              'whitespace-nowrap rounded-[var(--radius-pill)] px-3 py-2 text-sm transition-colors sm:py-1.5',
              active ? 'bg-signal font-medium text-ink' : 'text-text-muted hover:text-text',
            ].join(' ')}
          >
            {preset.label}
          </Link>
        );
      })}
    </nav>
  );
}
