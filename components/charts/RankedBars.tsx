import { EmptyState } from '@/components/molecules/EmptyState';
import type { Ranking } from '@/lib/analytics/ranking';

/**
 * A ranked list is a table of one dimension. Hand-rolled rather than Recharts:
 * the label, the bar, the count and the share all belong on one line, which a
 * chart library fights rather than helps.
 *
 * Bars are scaled to the LEADER, not to the total. A dimension whose top value
 * holds 30 % would otherwise render as a row of slivers with no visible
 * ranking — the share text carries the absolute proportion.
 */
export function RankedBars({ ranking, colour }: { ranking: Ranking; colour: string }) {
  if (ranking.rows.length === 0) {
    return (
      <EmptyState title="Pas encore de données">
        Dès les premiers scans de la période, le classement apparaît ici.
      </EmptyState>
    );
  }

  const leader = ranking.rows[0].scans || 1;

  return (
    <>
      {!ranking.enoughData && (
        <p className="mb-3 text-xs text-text-muted">
          Encore trop peu de scans sur cette période pour que ces pourcentages soient
          significatifs.
        </p>
      )}
      <ol className="flex flex-col gap-3">
        {ranking.rows.map((row) => (
          <li key={row.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className={row.isOther ? 'text-text-muted' : 'text-text-body'}>{row.label}</span>
              <span className="flex shrink-0 items-baseline gap-2">
                {row.uniquesLabel && (
                  <span className="text-xs text-text-muted">{row.uniquesLabel} personnes</span>
                )}
                <span className="font-display text-sm font-bold text-ink">{row.scansLabel}</span>
                <span className="w-12 text-right text-xs text-text-muted">{row.shareLabel}</span>
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-[var(--radius-pill)] bg-canvas">
              <div
                data-bar
                className="h-2.5 rounded-[var(--radius-pill)]"
                style={{
                  width: `${((row.scans / leader) * 100).toFixed(1)}%`,
                  backgroundColor: colour,
                  opacity: row.isOther ? 0.45 : 1,
                }}
              />
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
