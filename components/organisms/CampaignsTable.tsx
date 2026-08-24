import Link from 'next/link';
import { Card } from '@/components/atoms/Card';
import { StateBadge } from '@/components/atoms/StateBadge';
import { Sparkline } from '@/components/charts/Sparkline';
import { EmptyState } from '@/components/molecules/EmptyState';
import { formatNumber, formatRate } from '@/lib/analytics/format';
import { MIN_SPARKLINE_VOLUME, type CampaignSparkline } from '@/lib/analytics/campaignSeries';
import type { CampaignRow } from '@/lib/analytics/types';
import { CHARTE } from '@/lib/charte';
import type { PeriodPreset } from '@/lib/period';

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

/**
 * Spec §4.6-2: « personnes touchées » is never printed without saying what it
 * is. The definition lives HERE, not on the pages, because this table now has
 * two homes and only one of them has a neighbour that defines the term: on / it
 * sits under a KPI tile carrying the hint, but on /campagnes it is the entire
 * content of the page and nothing else defines anything. The column is in fact
 * worse than the KPI's — `campaign.uniques` from `client_campaigns()` is a
 * lifetime SUM of per-day uniques, so « Personnes 8 400 » may be a few hundred
 * people who came back. Same sentence as /audience's « Où » card, deliberately
 * word-for-word so the two cannot drift.
 */
const PERSONNES_HINT = 'Personnes = comptage unique par jour, par campagne.';
export function CampaignsTable({
  campaigns,
  period,
  sparklines,
  title = 'Vos campagnes',
}: {
  campaigns: CampaignRow[];
  /**
   * The active period preset, carried into every drill-down link.
   *
   * Required rather than defaulted: a missing period does not fail, it silently
   * sends a sponsor reading ?p=90j to the detail page's default 30 j, where
   * every KPI changes under them and nothing on screen says why. A default here
   * would make the next call site do that quietly; a required prop makes it a
   * compile error.
   */
  period: PeriodPreset;
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
          ? `Totaux depuis le début · courbe sur la période sélectionnée. ${PERSONNES_HINT}`
          : `Totaux depuis le début. ${PERSONNES_HINT}`
      }
    >
      {/* Campaign name pinned, same reasoning as LeadsTable. */}
      <p className="mb-2 text-xs text-text-muted md:hidden">
        Faites défiler le tableau horizontalement pour voir toutes les colonnes.
      </p>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className={['w-full border-collapse text-sm', showTrend ? 'min-w-[760px]' : 'min-w-[640px]'].join(' ')}>
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
              <th scope="col" className="sticky left-0 z-10 bg-surface pb-2 pr-3 font-medium">Campagne</th>
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
                  <td className="sticky left-0 z-10 bg-surface py-3 pr-3 font-medium text-ink">
                    <Link
                      href={`/campagnes/${campaign.slug}?p=${period}`}
                      className="underline-offset-2 hover:underline"
                    >
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
                      <div className="flex items-center gap-2">
                        {/*
                          §4.6-3. Two things this column used to get wrong, both
                          only visible to a sighted reader:

                          1. Its only figure lived in `sr-only` text. Everything
                             else in the row is a LIFETIME total, so the period
                             number had no visible home at all — and a curve
                             with no number is a shape a client cannot check.
                          2. `Sparkline` auto-scales each row to its own min and
                             max, so 1 → 2 and 400 → 500 draw the same rising
                             line at the same amplitude. Below
                             MIN_SPARKLINE_VOLUME the shape is noise, and the
                             portal says so out loud here exactly as
                             `RankedBars` does with its visible LowDataNote,
                             rather than relying on a caption nobody sees.

                          The number stays either way: suppressing the curve
                          withholds an unreliable shape, never a real figure.
                        */}
                        {spark && spark.total >= MIN_SPARKLINE_VOLUME ? (
                          <Sparkline values={spark.values} color={CHARTE.jaune} />
                        ) : (
                          <span className="text-xs text-text-muted">
                            {spark ? 'Pas encore assez de scans' : '—'}
                          </span>
                        )}
                        {/*
                          aria-hidden because the sr-only caption above already
                          announces this same number inside a sentence that says
                          what it counts; announcing it twice is worse than once.
                        */}
                        {spark && (
                          <span aria-hidden="true" className="text-xs tabular-nums text-text-muted">
                            {spark.totalLabel}
                          </span>
                        )}
                      </div>
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
