import Link from 'next/link';
import { Card } from '@/components/atoms/Card';
import { StateBadge } from '@/components/atoms/StateBadge';
import { Sparkline } from '@/components/charts/Sparkline';
import { EmptyState } from '@/components/molecules/EmptyState';
import { formatNumber, formatRate } from '@/lib/analytics/format';
import type { CampaignSparkline } from '@/lib/analytics/campaignSeries';
import type { CampaignRow } from '@/lib/analytics/types';
import { CHARTE } from '@/lib/charte';

/**
 * The campaigns rollup table, on both the Vue d'ensemble and /campagnes.
 *
 * MIXED BASIS, stated rather than hidden. `client_campaigns()` takes no date
 * range, so Distribués / Scans / Personnes / Contacts are LIFETIME totals,
 * while the Tendance curve follows the period pills. The subtitle names both
 * bases whenever a curve is present. The alternative — dropping the curve, or
 * silently letting the period pills appear to govern the whole table — is worse
 * on the honesty rules than saying it out loud.
 *
 * `sparklines` is optional so the table renders correctly when the stage-3B
 * migration has not been applied yet (see lib/data/campaigns.ts).
 */
export function CampaignsTable({
  campaigns,
  sparklines,
  title = 'Vos campagnes',
}: {
  campaigns: CampaignRow[];
  sparklines?: Record<string, CampaignSparkline>;
  title?: string;
}) {
  if (campaigns.length === 0) {
    return (
      <Card title={title}>
        <EmptyState title="Aucune campagne pour le moment">
          Dès qu’une campagne est lancée pour vous, elle apparaît ici.
        </EmptyState>
      </Card>
    );
  }

  const showTrend = sparklines !== undefined;

  return (
    <Card
      title={title}
      subtitle={
        showTrend
          ? 'Totaux depuis le début · courbe sur la période sélectionnée'
          : 'Totaux depuis le début'
      }
    >
      <div className="overflow-x-auto">
        <table className={['w-full border-collapse text-sm', showTrend ? 'min-w-[760px]' : 'min-w-[640px]'].join(' ')}>
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
              <th scope="col" className="pb-2 pr-3 font-medium">Campagne</th>
              <th scope="col" className="pb-2 pr-3 font-medium">État</th>
              <th scope="col" className="pb-2 pr-3 text-right font-medium">Distribués</th>
              <th scope="col" className="pb-2 pr-3 text-right font-medium">Scans</th>
              <th scope="col" className="pb-2 pr-3 text-right font-medium">Personnes</th>
              <th scope="col" className="pb-2 pr-3 text-right font-medium">Contacts</th>
              <th scope="col" className={['pb-2 text-right font-medium', showTrend ? 'pr-3' : ''].join(' ')}>Taux</th>
              {showTrend && <th scope="col" className="pb-2 font-medium">Tendance</th>}
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => {
              const spark = sparklines?.[campaign.slug];
              return (
                <tr key={campaign.slug} className="border-b border-border/60 last:border-0">
                  <td className="py-3 pr-3 font-medium text-ink">
                    <Link href={`/campagnes/${campaign.slug}`} className="underline-offset-2 hover:underline">
                      {campaign.name}
                    </Link>
                  </td>
                  <td className="py-3 pr-3">
                    <StateBadge active={campaign.active} />
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums">
                    {campaign.distributed_count === null ? '—' : formatNumber(campaign.distributed_count)}
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums">{formatNumber(campaign.scans)}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{formatNumber(campaign.uniques)}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{formatNumber(campaign.leads)}</td>
                  <td className={['py-3 text-right tabular-nums', showTrend ? 'pr-3' : ''].join(' ')}>
                    {formatRate(campaign.leads, campaign.uniques)}
                  </td>
                  {showTrend && (
                    <td className="py-3" title={spark?.caption}>
                      {/*
                        The caption is not decoration. `Sparkline` is
                        aria-hidden, so without it this column announces its
                        header and then silence — and the number it carries
                        (period scans) appears nowhere else in the row, since
                        every other column is a lifetime total.
                      */}
                      <span className="sr-only">{spark?.caption ?? 'Courbe indisponible.'}</span>
                      {spark && <Sparkline values={spark.values} color={CHARTE.jaune} />}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
