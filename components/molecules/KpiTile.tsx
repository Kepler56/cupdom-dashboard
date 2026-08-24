import { Info } from 'lucide-react';
import { Sparkline } from '@/components/charts/Sparkline';
import { Trend } from '@/components/atoms/Trend';
import { CHARTE } from '@/lib/charte';
import type { Kpi } from '@/lib/analytics/kpis';

/**
 * One number, its definition and its movement.
 *
 * The hint is rendered twice on purpose: as a `title` for the pointer, and as
 * visually-hidden text wired through `aria-describedby`. Spec §4.6-2 asks for
 * « personnes touchées » to carry its daily-uniqueness caveat, and a
 * hover-only tooltip does not carry it to a screen reader or a phone.
 */
export function KpiTile({ kpi }: { kpi: Kpi }) {
  const hintId = `kpi-${kpi.id}-hint`;

  return (
    <div aria-describedby={hintId} className="rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{kpi.label}</p>
        <span title={kpi.hint} className="shrink-0 text-text-muted">
          <Info size={14} strokeWidth={1.75} aria-hidden="true" />
        </span>
      </div>

      <p className="mt-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">{kpi.value}</p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <Trend trend={kpi.trend} label={kpi.trendLabel} />
        {kpi.sparkline.length > 1 && <Sparkline values={kpi.sparkline} color={CHARTE.jaune} />}
      </div>

      <p id={hintId} className="sr-only">
        {kpi.hint}
      </p>
    </div>
  );
}
