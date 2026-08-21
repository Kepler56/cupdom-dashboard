import type { CampaignSparkline } from '@/lib/analytics/campaignSeries';
import { DEFAULT_GEO_LEVEL } from '@/lib/analytics/geo';
import type { CampaignRow, DailyRow, FunnelRow, GeoRow, HourlyRow, OverviewRow, TechRow } from '@/lib/analytics/types';
import type { PeriodPreset, PeriodRange } from '@/lib/period';
import { createServerClient } from '@/lib/supabase/server';
import { loadSparklines } from './campaigns';
import { classifyPostgrestError, type DataResult } from './result';
import { resolveScope } from './scope';
import { levelParam } from './scopeParams';

export interface OverviewData {
  campaigns: CampaignRow[];
  /** The campaign actually in scope after validation. Null means "all of them". */
  slug: string | null;
  current: OverviewRow;
  previous: OverviewRow;
  daily: DailyRow[];
  funnel: FunnelRow;
  sparklines: Record<string, CampaignSparkline>;
  /**
   * The three reads behind « Temps forts ».
   *
   * Null means the read FAILED and that insight is dropped; an empty array
   * means it succeeded and found nothing, which is a legitimate answer a
   * generator is allowed to see. Not folded into the failure gate below: these
   * feed three sentences in one card, and taking a working dashboard down to
   * admit that a highlight is missing trades a product for a scary screen.
   */
  hourly: HourlyRow[] | null;
  geo: GeoRow[] | null;
  tech: TechRow[] | null;
}

const EMPTY_FUNNEL: FunnelRow = {
  distribues: 0,
  scannes: 0,
  formulaire_vu: 0,
  formulaire_soumis: 0,
  offre_atteinte: 0,
};

const emptyBucket = (bucket: OverviewRow['bucket']): OverviewRow => ({ bucket, scans: 0, uniques: 0, leads: 0 });

/**
 * A read whose failure is survivable.
 *
 * Same contract as `loadSparklines`, expressed once for the three insight
 * reads. It warns rather than staying silent, because a quietly missing
 * highlight would hide a broken RPC for as long as nobody noticed a sentence
 * that never appears.
 *
 * Code and message only — this runs inside a request that has just read a
 * client's own aggregates.
 */
export function optionalRows<T>(
  label: string,
  response: { data: unknown; error: { code?: string | null; message?: string | null } | null },
): T[] | null {
  if (response.error) {
    console.warn(`[portail] ${label} indisponible, temps fort masqué:`, response.error.code, response.error.message);
    return null;
  }
  return (response.data ?? []) as T[];
}

/**
 * The only place the portal talks to the database.
 *
 * Reads run through the SSR client, so Postgres sees the client's own JWT and
 * both RLS and the SECURITY DEFINER guards apply. Nothing here re-implements a
 * calculation: the RPCs aggregate, the pure modules shape.
 */
export async function fetchOverview(args: {
  range: PeriodRange;
  preset: PeriodPreset;
  rawSlug: string | undefined;
}): Promise<DataResult<OverviewData>> {
  const supabase = await createServerClient();

  const scope = await resolveScope(supabase, args.rawSlug);
  if (!scope.ok) return scope;
  const { campaigns, slug } = scope.data;

  const from = args.range.from.toISOString();
  const to = args.range.to.toISOString();

  const [overview, daily, funnel, hourly, geo, tech] = await Promise.all([
    supabase.rpc('client_overview', {
      p_from: from,
      p_to: to,
      p_prev_from: args.range.prevFrom.toISOString(),
      p_prev_to: args.range.prevTo.toISOString(),
      p_slug: slug,
    }),
    supabase.rpc('client_scans_daily', { p_from: from, p_to: to, p_slug: slug }),
    // No date parameters — the funnel is always campaign lifetime (spec §4.9).
    supabase.rpc('client_funnel', { p_slug: slug }),
    // The three below feed « Temps forts » only. City, not country: a French
    // sponsor's country ranking is one bar reading « France », which is exactly
    // the uninformative sentence citiesInsight refuses to build. Same level the
    // audience page defaults to, through the same guard.
    supabase.rpc('client_scans_hourly', { p_from: from, p_to: to, p_slug: slug }),
    supabase.rpc('client_scans_geo', {
      p_from: from,
      p_to: to,
      p_slug: slug,
      p_level: levelParam(DEFAULT_GEO_LEVEL),
    }),
    supabase.rpc('client_scans_tech', { p_from: from, p_to: to, p_slug: slug }),
  ]);

  // THREE reads in this gate, not six. See OverviewData.hourly.
  const failed = [overview, daily, funnel].find((response) => response.error);
  if (failed) return { ok: false, failure: classifyPostgrestError(failed.error) };

  const buckets = (overview.data ?? []) as OverviewRow[];

  return {
    ok: true,
    data: {
      campaigns,
      slug,
      current: buckets.find((b) => b.bucket === 'current') ?? emptyBucket('current'),
      previous: buckets.find((b) => b.bucket === 'previous') ?? emptyBucket('previous'),
      daily: (daily.data ?? []) as DailyRow[],
      funnel: ((funnel.data ?? []) as FunnelRow[])[0] ?? EMPTY_FUNNEL,
      // Sequential, after the three parallel reads rather than inside them:
      // this one cannot fail the page, so it must not be able to land in the
      // `[overview, daily, funnel].find(r => r.error)` check above.
      sparklines: await loadSparklines(supabase, args.range, args.preset, campaigns.map((c) => c.slug)),
      hourly: optionalRows<HourlyRow>('client_scans_hourly', hourly),
      geo: optionalRows<GeoRow>('client_scans_geo', geo),
      tech: optionalRows<TechRow>('client_scans_tech', tech),
    },
  };
}
