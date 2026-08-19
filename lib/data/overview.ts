import type { CampaignRow, DailyRow, FunnelRow, OverviewRow } from '@/lib/analytics/types';
import type { PeriodRange } from '@/lib/period';
import { createServerClient } from '@/lib/supabase/server';
import { classifyPostgrestError, type DataResult } from './result';
import { resolveScope } from './scope';

export interface OverviewData {
  campaigns: CampaignRow[];
  /** The campaign actually in scope after validation. Null means "all of them". */
  slug: string | null;
  current: OverviewRow;
  previous: OverviewRow;
  daily: DailyRow[];
  funnel: FunnelRow;
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
 * The only place the portal talks to the database.
 *
 * Reads run through the SSR client, so Postgres sees the client's own JWT and
 * both RLS and the SECURITY DEFINER guards apply. Nothing here re-implements a
 * calculation: the RPCs aggregate, the pure modules shape.
 */
export async function fetchOverview(args: {
  range: PeriodRange;
  rawSlug: string | undefined;
}): Promise<DataResult<OverviewData>> {
  const supabase = await createServerClient();

  const scope = await resolveScope(supabase, args.rawSlug);
  if (!scope.ok) return scope;
  const { campaigns, slug } = scope.data;

  const [overview, daily, funnel] = await Promise.all([
    supabase.rpc('client_overview', {
      p_from: args.range.from.toISOString(),
      p_to: args.range.to.toISOString(),
      p_prev_from: args.range.prevFrom.toISOString(),
      p_prev_to: args.range.prevTo.toISOString(),
      p_slug: slug,
    }),
    supabase.rpc('client_scans_daily', {
      p_from: args.range.from.toISOString(),
      p_to: args.range.to.toISOString(),
      p_slug: slug,
    }),
    // No date parameters — the funnel is always campaign lifetime (spec §4.9).
    supabase.rpc('client_funnel', { p_slug: slug }),
  ]);

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
    },
  };
}
