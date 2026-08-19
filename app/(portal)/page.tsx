import { buildFunnel } from '@/lib/analytics/funnel';
import { buildKpis, trendNote } from '@/lib/analytics/kpis';
import { selectedCampaigns } from '@/lib/analytics/selection';
import { fillDailySeries } from '@/lib/analytics/series';
import { fetchOverview } from '@/lib/data/overview';
import { parsePeriod, resolvePeriod } from '@/lib/period';
import { getClientAccount } from '@/lib/session';
import { Card } from '@/components/atoms/Card';
import { Point } from '@/components/atoms/Point';
import { AccessDenied } from '@/components/molecules/AccessDenied';
import { EmptyState } from '@/components/molecules/EmptyState';
import { ErrorState } from '@/components/molecules/ErrorState';
import { KpiTile } from '@/components/molecules/KpiTile';
import { ScansArea } from '@/components/charts/ScansArea';
import { CampaignsTable } from '@/components/organisms/CampaignsTable';
import { FunnelBars } from '@/components/organisms/FunnelBars';
import { TopBar } from '@/components/organisms/TopBar';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; c?: string }>;
}) {
  const account = await getClientAccount();
  const params = await searchParams;
  const period = parsePeriod(params.p);
  const range = resolvePeriod(period, new Date());
  const result = await fetchOverview({ range, rawSlug: params.c });
  const company = account?.displayName ?? 'Votre compte';

  // Spec §6: a failed read is never rendered as zeros. "You have no access" and
  // "you have no data" get different screens on purpose.
  if (!result.ok) {
    return (
      <>
        <TopBar company={company} period={period} campaigns={[]} campaign={null} />
        <main className="flex flex-1 items-center justify-center p-6">
          {result.failure.kind === 'refused' ? <AccessDenied /> : <ErrorState message={result.failure.message} />}
        </main>
      </>
    );
  }

  const { campaigns, slug, current, previous, daily, funnel } = result.data;

  // The `?c=` filter means ONE thing across the whole screen. Every module below
  // — KPIs, cost tile, chart, funnel, table — reads this one narrowed list, so a
  // client on ?c=nike-hiver never sees one campaign's figures beside a table
  // listing all of them.
  const scope = selectedCampaigns(campaigns, slug);

  // `from = null` for the 'tout' preset: resolvePeriod returns the epoch there,
  // and the series must start where the data starts, not in 1970. Tested against
  // the preset itself rather than `range.hasPrevious`: the two coincide today
  // only because 'tout' happens to be the one preset without a prior window, and
  // a future preset with the same property would silently truncate its series.
  const series = fillDailySeries(daily, period === 'tout' ? null : range.from, range.to);
  const kpis = buildKpis({
    current,
    previous,
    hasPrevious: range.hasPrevious,
    series,
    campaigns: scope,
  });
  // client_funnel sums coalesce(distributed_count, 0) across the selection, so a
  // total built from only some campaigns is a partial denominator. All-or-nothing,
  // like the cost tile's invested_amount_eur.
  const note = trendNote(kpis, range.hasPrevious);
  const parcours = buildFunnel(funnel, {
    distributionComplete: scope.length > 0 && scope.every((c) => c.distributed_count !== null && c.distributed_count > 0),
  });
  const hasActivity = current.scans > 0 || current.leads > 0;

  return (
    <>
      <TopBar
        company={company}
        period={period}
        campaigns={campaigns.map((c) => ({ slug: c.slug, name: c.name }))}
        campaign={slug}
      />

      <main className="flex flex-1 flex-col gap-6 p-6">
        <section className="trame-point rounded-[var(--radius-card)] border border-border bg-surface p-6">
          <div className="flex items-center gap-2">
            <span className="text-signal">
              <Point size={16} hole="var(--surface)" />
            </span>
            <h1 className="font-display text-2xl font-bold text-ink">Bonjour, {company}.</h1>
          </div>
          {/* Spec §4.6-1. No stage-1 RPC returns a bot count, so the exclusion
              is disclosed rather than quantified. See the plan's "Known gaps". */}
          <p className="mt-1 text-sm text-text-muted">
            Voici ce que votre marque a produit. Les robots sont exclus de tous les chiffres.
          </p>
        </section>

        {/* The test id exists because several of these labels legitimately appear
            twice on the page — « Personnes touchées » is both a KPI label and a
            chart toggle — and an end-to-end assertion has to say which one it
            means rather than reach for .first(). */}
        <section data-testid="kpi-grid" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiTile key={kpi.id} kpi={kpi} />
          ))}
        </section>

        {note && <p className="-mt-2 text-xs text-text-muted">{note}</p>}

        <Card title="Scans dans le temps" subtitle="Par jour, heure de Paris">
          {/* Gated on activity alone. A `series.length > 1` condition also hid the
              chart on launch day — one point under ?p=tout — printing « pas encore
              assez de données » directly beneath a « Scans totaux » tile showing a
              real number. Recharts draws a single-point area fine. */}
          {hasActivity ? (
            <ScansArea series={series} />
          ) : (
            <EmptyState title="Pas encore assez de données">
              Dès les premiers scans de la période, la courbe apparaît ici.
            </EmptyState>
          )}
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <div data-testid="funnel" className="contents">
            <FunnelBars funnel={parcours} />
          </div>
          <CampaignsTable campaigns={scope} />
        </div>
      </main>
    </>
  );
}
