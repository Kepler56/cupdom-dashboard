import { CHARTE } from '@/lib/charte';

/**
 * The same data as the heatmap, collapsed to seven rows and readable without
 * colour. Quiet days are rendered rather than dropped: "nobody scans on a
 * Monday" is one of the more useful things this screen says.
 */
export function WeekdayBars({
  totals,
}: {
  totals: { dow: number; label: string; scans: number; scansLabel: string; share: number; shareLabel: string }[];
}) {
  const leader = totals.reduce((m, d) => (d.scans > m ? d.scans : m), 0) || 1;

  return (
    <ol className="flex flex-col gap-2.5">
      {totals.map((day) => (
        <li key={day.dow} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-sm text-text-body">{day.label}</span>
          <span className="h-2.5 flex-1 overflow-hidden rounded-[var(--radius-pill)] bg-canvas">
            <span
              className="block h-2.5 rounded-[var(--radius-pill)]"
              style={{ width: `${((day.scans / leader) * 100).toFixed(1)}%`, backgroundColor: CHARTE.bleu }}
            />
          </span>
          <span className="w-12 shrink-0 text-right font-display text-sm font-bold text-ink">
            {day.scansLabel}
          </span>
          <span className="w-12 shrink-0 text-right text-xs text-text-muted">{day.shareLabel}</span>
        </li>
      ))}
    </ol>
  );
}
