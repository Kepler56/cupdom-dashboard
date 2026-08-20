import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/atoms/Card';
import { DeviceDonut } from '@/components/charts/DeviceDonut';
import { LowDataNote, RankedBars } from '@/components/charts/RankedBars';
import { ScansArea } from '@/components/charts/ScansArea';
import { AccessDenied } from '@/components/molecules/AccessDenied';
import { EmptyState } from '@/components/molecules/EmptyState';
import { ErrorState } from '@/components/molecules/ErrorState';
import { KpiTile } from '@/components/molecules/KpiTile';
import { CampaignHeader } from '@/components/organisms/CampaignHeader';
import { FunnelBars } from '@/components/organisms/FunnelBars';
import { LeadsPreview } from '@/components/organisms/LeadsPreview';
import { TopBar } from '@/components/organisms/TopBar';
import { buildCampaignHeader } from '@/lib/analytics/campaign';
import { buildFunnel } from '@/lib/analytics/funnel';
import { buildKpis, trendNote } from '@/lib/analytics/kpis';
import { buildRanking } from '@/lib/analytics/ranking';
import { fillDailySeries } from '@/lib/analytics/series';
import { groupTech } from '@/lib/analytics/tech';
import { CHARTE } from '@/lib/charte';
import { fetchCampaign } from '@/lib/data/campaign';
import { parsePeriod, resolvePeriod } from '@/lib/period';
import { scanUrl } from '@/lib/qr';
import { getClientAccount } from '@/lib/session';

export default async function CampagnePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const account = await getClientAccount();
  const { slug } = await params;
  const query = await searchParams;
  const period = parsePeriod(query.p);
  const range = resolvePeriod(period, new Date());
  const result = await fetchCampaign({ slug, range });
  const company = account?.displayName ?? 'Votre compte';

  if (!result.ok) {
    // 404 first: it is the only failure that is not an error. notFound() throws,
    // so nothing below runs.
    if (result.failure.kind === 'notFound') notFound();

    return (
      <>
        <TopBar company={company} period={period} campaigns={[]} campaign={null} showCampaignFilter={false} />
        <main className="flex flex-1 items-center justify-center p-6">
          {result.failure.kind === 'refused' ? <AccessDenied /> : <ErrorState message={result.failure.message} />}
        </main>
      </>
    );
  }

  const { campaign, current, previous, daily, funnel, geo, tech, leads } = result.data;

  const header = buildCampaignHeader(campaign);
  const series = fillDailySeries(daily, period === 'tout' ? null : range.from, range.to);

  // A single campaign, so the selection IS this campaign — which is what makes
  // the coût-par-contact tile meaningful here: §4.7's all-or-nothing rule has
  // exactly one campaign to satisfy, and the tile appears whenever this campaign
  // carries an invested_amount_eur.
  const kpis = buildKpis({ current, previous, hasPrevious: range.hasPrevious, series, campaigns: [campaign] });
  const note = trendNote(kpis, range.hasPrevious);

  const parcours = buildFunnel(funnel, {
    distributionComplete: campaign.distributed_count !== null && campaign.distributed_count > 0,
  });

  const villes = buildRanking(geo);
  const technology = groupTech(tech);
  const hasActivity = current.scans > 0 || current.leads > 0;

  return (
    <>
      <TopBar company={company} period={period} campaigns={[]} campaign={null} showCampaignFilter={false} />

      <main className="flex flex-1 flex-col gap-6 p-6">
        <Link
          href="/campagnes"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-text-muted hover:text-text"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Toutes vos campagnes
        </Link>

        <CampaignHeader header={header} scanUrl={scanUrl(campaign.slug)} />

        <p className="-mb-2 text-sm text-text-muted">Les robots sont exclus de tous les chiffres.</p>

        <section data-testid="kpi-grid" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiTile key={kpi.id} kpi={kpi} />
          ))}
        </section>

        {note && <p className="-mt-2 text-xs text-text-muted">{note}</p>}

        <Card title="Scans dans le temps" subtitle="Par jour, heure de Paris">
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

          {/*
            Villes and not lieux: `venue` lives on the CAMPAIGN (spec §4.8), so a
            single campaign's venue ranking is one bar reading its own name. The
            header already states the venue. Bleu Roi because this is the
            Audience view's language quoted here, not a new accent.
          */}
          <Card
            title="Où"
            subtitle="Villes, sur la période sélectionnée. Personnes = comptage unique par jour, par campagne."
          >
            <RankedBars ranking={villes} colour={CHARTE.bleu} />
          </Card>
        </div>

        <Card
          title="Comment"
          subtitle="Répartition des scans — ces pourcentages portent sur les scans, pas sur les personnes"
        >
          {!technology.device_type.enoughData && <LowDataNote className="mb-6" />}
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">Appareil</h3>
              <DeviceDonut ranking={technology.device_type} />
            </div>
            <div>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">Système</h3>
              <RankedBars ranking={technology.os} colour={CHARTE.encre} suppressLowDataNote />
            </div>
          </div>
          <p className="mt-6 text-xs text-text-muted">
            Navigateur, langue et heures de scan : voir{' '}
            <Link href={`/audience?c=${campaign.slug}&p=${period}`} className="underline underline-offset-2">
              l’audience de cette campagne
            </Link>
            .
          </p>
        </Card>

        <LeadsPreview leads={leads} total={campaign.leads} />
      </main>
    </>
  );
}
