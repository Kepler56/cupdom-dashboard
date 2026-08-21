import { Card } from '@/components/atoms/Card';
import { Point } from '@/components/atoms/Point';
import { EmptyState } from '@/components/molecules/EmptyState';
import type { Insight } from '@/lib/analytics/insights';

/**
 * « Temps forts » — spec §4.5, and §3.4 job 3 for the bullet.
 *
 * The point-couvercle is the list marker, which is the charte's own third job
 * for the mark and the reason this strip reads as Cupdom rather than as a
 * generic dashboard callout.
 *
 * The emphasis arrives already split into three fields. Interpolating markup
 * into a sentence that includes a client's own city and campaign names would
 * mean either `dangerouslySetInnerHTML` or parsing markers back out at render
 * time; neither is worth it for one bold span.
 */
export function Highlights({ insights }: { insights: Insight[] }) {
  return (
    <Card title="Temps forts" subtitle="Ce que vos chiffres disent de plus notable">
      {insights.length === 0 ? (
        <EmptyState title="Pas encore assez de données">
          Dès que vos campagnes auront assez de scans, les faits marquants apparaîtront ici.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {insights.map((insight) => (
            <li key={insight.id} className="flex items-start gap-2.5">
              <span className="mt-[0.3rem] shrink-0 text-signal" aria-hidden="true">
                <Point size={9} hole="var(--surface)" />
              </span>
              <p className="text-sm text-text-body">
                {insight.lead}
                <strong className="font-semibold text-ink">{insight.emphasis}</strong>
                {insight.tail}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
