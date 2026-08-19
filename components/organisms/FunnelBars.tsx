import { Card } from '@/components/atoms/Card';
import { CHARTE } from '@/lib/charte';
import type { FunnelView } from '@/lib/analytics/funnel';

/**
 * Hand-rolled rather than Recharts: a funnel is five labelled bars, and the
 * library's FunnelChart would fight the charte on radius, label placement and
 * colour before drawing anything better.
 */
export function FunnelBars({ funnel }: { funnel: FunnelView }) {
  return (
    <Card title="Le parcours" subtitle="Depuis le début — ce module ne suit pas la période sélectionnée">
      {funnel.distributionUnknown && (
        <p className="mb-4 text-xs text-text-muted">
          Distribués : non renseigné. Le parcours part donc des scans.
        </p>
      )}

      <ol className="flex flex-col gap-4">
        {funnel.stages.map((stage, index) => (
          <li key={stage.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-sm text-text-body">{stage.label}</span>
              <span className="font-display text-sm font-bold text-ink">{stage.valueLabel}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-[var(--radius-pill)] bg-canvas">
              <div
                className="h-3 rounded-[var(--radius-pill)]"
                style={{
                  width: `${(stage.share * 100).toFixed(1)}%`,
                  // The reference stage is ink; everything measured against it
                  // is the signal colour, so the eye reads the drop.
                  backgroundColor: index === 0 ? CHARTE.encre : CHARTE.jaune,
                }}
              />
            </div>
            {stage.dropLabel && (
              <p className="mt-1 text-xs text-text-muted">{stage.dropLabel} de perte à cette étape</p>
            )}
          </li>
        ))}
      </ol>

      {funnel.worstDrop && (
        <p className="mt-5 rounded-[var(--radius-card)] bg-canvas p-3 text-sm text-text-body">
          {funnel.worstDrop.sentence}
        </p>
      )}
    </Card>
  );
}
