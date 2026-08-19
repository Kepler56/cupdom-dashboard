import { Card } from '@/components/atoms/Card';
import { DeviceDonut } from '@/components/charts/DeviceDonut';
import { Heatmap } from '@/components/charts/Heatmap';
import { HourlyBars } from '@/components/charts/HourlyBars';
import { LowDataNote, RankedBars } from '@/components/charts/RankedBars';
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

  // Found by id, not `[0]`/`slice(1)`: the donut is hard-wired to
  // `device_type` specifically (it is the one dimension where "part of a
  // whole" is the right question), not to "whichever section happens to be
  // first". Indexing into TECH_SECTIONS would silently mislabel the donut if
  // that array were ever reordered — no compile error, no failing test.
  const deviceSection = TECH_SECTIONS.find((s) => s.id === 'device_type');
  const deviceLabel = deviceSection?.label ?? 'Appareil';
  const otherSections = TECH_SECTIONS.filter((s) => s.id !== 'device_type');

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
          {/*
            Once, at the top, rather than once per ranking. The four technology
            dimensions all count the same scans, so they share one denominator:
            a client with twelve scans used to read the caveat three times with
            a confident « Mobile 83 % » donut above them — the honesty rule
            failing exactly where the most persuasive number sits. device_type
            is the denominator's stand-in for that reason.
          */}
          {!technology.device_type.enoughData && <LowDataNote className="mb-6" />}
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
                {deviceLabel}
              </h3>
              <DeviceDonut ranking={technology.device_type} />
            </div>
            {otherSections.map((section) => (
              <div key={section.id}>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
                  {section.label}
                </h3>
                <RankedBars ranking={technology[section.id]} colour={CHARTE.encre} suppressLowDataNote />
              </div>
            ))}
          </div>
        </Card>
      </main>
    </>
  );
}
