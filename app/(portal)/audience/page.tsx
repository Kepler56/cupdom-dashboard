import { Card } from '@/components/atoms/Card';
import { DeviceDonut } from '@/components/charts/DeviceDonut';
import { Heatmap } from '@/components/charts/Heatmap';
import { HourlyBars } from '@/components/charts/HourlyBars';
import { RankedBars } from '@/components/charts/RankedBars';
import { WeekdayBars } from '@/components/charts/WeekdayBars';
import { AccessDenied } from '@/components/molecules/AccessDenied';
import { ErrorState } from '@/components/molecules/ErrorState';
import { GeoLevelPicker } from '@/components/molecules/GeoLevelPicker';
import { TopBar } from '@/components/organisms/TopBar';
import { geoLevelsFor } from '@/lib/analytics/geo';
import { buildHeatmap, hourlyTotals, weekdayTotals } from '@/lib/analytics/heatmap';
import { buildRanking } from '@/lib/analytics/ranking';
import { groupTech, TECH_SECTIONS } from '@/lib/analytics/tech';
import { CHARTE } from '@/lib/charte';
import { fetchAudience } from '@/lib/data/audience';
import { parsePeriod, resolvePeriod } from '@/lib/period';
import { getClientAccount } from '@/lib/session';

export default async function AudiencePage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; c?: string; geo?: string }>;
}) {
  const account = await getClientAccount();
  const params = await searchParams;
  const period = parsePeriod(params.p);
  const range = resolvePeriod(period, new Date());
  const result = await fetchAudience({ range, rawSlug: params.c, rawLevel: params.geo });
  const company = account?.displayName ?? 'Votre compte';

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

  const { campaigns, slug, level, hasVenue, geo, hourly, tech } = result.data;

  const ranking = buildRanking(geo);
  const heatmap = buildHeatmap(hourly);
  const byWeekday = weekdayTotals(hourly);
  const byHour = hourlyTotals(hourly);
  const technology = groupTech(tech);

  return (
    <>
      <TopBar
        company={company}
        period={period}
        campaigns={campaigns.map((c) => ({ slug: c.slug, name: c.name }))}
        campaign={slug}
      />

      <main className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Audience</h1>
          <p className="mt-1 text-sm text-text-muted">
            Qui a scanné, quand et où. Les robots sont exclus de tous les chiffres.
          </p>
        </div>

        <Card
          title="Où"
          subtitle="Classé par scans, sur la période sélectionnée"
          action={<GeoLevelPicker levels={geoLevelsFor(hasVenue)} current={level} />}
        >
          <RankedBars ranking={ranking} colour={CHARTE.bleu} />
        </Card>

        <Card title="Quand" subtitle="Heure de Paris — la nuit d’un vendredi se lit le samedi au petit matin">
          <div data-testid="heatmap">
            <Heatmap heatmap={heatmap} />
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Par jour de la semaine">
            <WeekdayBars totals={byWeekday} />
          </Card>
          <Card title="Par heure">
            <HourlyBars totals={byHour} />
          </Card>
        </div>

        <Card
          title="Comment"
          subtitle="Répartition des scans — ces pourcentages portent sur les scans, pas sur les personnes"
        >
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
                {TECH_SECTIONS[0].label}
              </h3>
              <DeviceDonut ranking={technology.device_type} />
            </div>
            {TECH_SECTIONS.slice(1).map((section) => (
              <div key={section.id}>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
                  {section.label}
                </h3>
                <RankedBars ranking={technology[section.id]} colour={CHARTE.encre} />
              </div>
            ))}
          </div>
        </Card>
      </main>
    </>
  );
}
