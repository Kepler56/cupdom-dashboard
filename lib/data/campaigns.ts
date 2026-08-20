import { groupCampaignSeries, toSparklines, type CampaignSparkline } from '@/lib/analytics/campaignSeries';
import type { CampaignDailyRow, CampaignRow } from '@/lib/analytics/types';
import type { PeriodPreset, PeriodRange } from '@/lib/period';
import { createServerClient, type SupabaseServerClient } from '@/lib/supabase/server';
import type { DataResult } from './result';
import { resolveScope } from './scope';

export interface CampaignsData {
  campaigns: CampaignRow[];
  sparklines: Record<string, CampaignSparkline>;
}

/**
 * The sparkline column's data — and the ONE read in this portal whose failure
 * never reaches the user.
 *
 * Everywhere else, a failed read renders « Chargement impossible » rather than a
 * zero, because a false zero is a more expensive lie than an error. That rule is
 * about FIGURES. This is an ornament drawn beside figures that have already been
 * fetched, are already correct, and are already on the screen; taking the page
 * down to admit that a decoration is missing would trade a working dashboard for
 * a scary one.
 *
 * The concrete failure this exists for: `client_campaigns_daily` ships in the
 * `cupdom` repository's migration 0012, and the two repositories deploy
 * independently. Between an app deploy and the product owner running the SQL,
 * every portal page that renders this table would otherwise be down. PostgREST
 * answers an unknown function with `PGRST202`; a direct SQL path would give
 * Postgres's `42883`. Both are handled, and so is everything else — the campaign
 * list was fetched moments earlier through the same session, so a refusal or an
 * outage has already been classified by a caller that DOES surface it.
 *
 * It warns to the server log on every failure. Silence here would hide a
 * forgotten migration for as long as nobody looked at the table.
 */
export async function loadSparklines(
  supabase: SupabaseServerClient,
  range: PeriodRange,
  preset: PeriodPreset,
  slugs: string[],
): Promise<Record<string, CampaignSparkline>> {
  if (slugs.length === 0) return {};

  const { data, error } = await supabase.rpc('client_campaigns_daily', {
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
  });

  if (error) {
    console.warn('[portail] client_campaigns_daily indisponible, courbes masquées:', error.code, error.message);
    return {};
  }

  return toSparklines(
    groupCampaignSeries({
      rows: (data ?? []) as CampaignDailyRow[],
      slugs,
      // Tested against the PRESET, never against `range.hasPrevious`. The epoch
      // is what resolvePeriod('tout') hands back and seriesWindow reads null as
      // "start where the data starts", so the two happen to coincide today —
      // but only because 'tout' is the one preset without a prior window, which
      // is a property of the trend comparison and not of the series. A future
      // preset with the same property (« depuis le lancement », say) would
      // silently truncate every curve to its own window with no error anywhere.
      // app/(portal)/page.tsx already refuses that proxy, in those words, for
      // its own fillDailySeries call; this is the same decision made the same
      // way rather than two adjacent files disagreeing.
      from: preset === 'tout' ? null : range.from,
      to: range.to,
    }),
  );
}

/**
 * The /campagnes screen's read.
 *
 * Deliberately ignores `?c=`. Every other screen narrows to the filtered
 * campaign; this one IS the list of campaigns, and filtering it to a single row
 * turns the page into a worse version of the detail page. The TopBar hides the
 * filter here for the same reason.
 */
export async function fetchCampaigns(args: {
  range: PeriodRange;
  preset: PeriodPreset;
}): Promise<DataResult<CampaignsData>> {
  const supabase = await createServerClient();

  const scope = await resolveScope(supabase, undefined);
  if (!scope.ok) return scope;

  const campaigns = byNewestFirst(scope.data.campaigns);

  return {
    ok: true,
    data: {
      campaigns,
      sparklines: await loadSparklines(supabase, args.range, args.preset, campaigns.map((c) => c.slug)),
    },
  };
}

/**
 * « Les plus récentes d'abord », enforced here rather than assumed.
 *
 * The /campagnes page states that ordering on screen. `client_campaigns()`
 * makes no such promise — it lives in the `cupdom` repository, which deploys
 * independently, so an ORDER BY added or dropped there would turn a sentence in
 * this product into a falsehood with nothing failing. Sorting on the row we
 * already have costs nothing and makes the claim true whatever the other side
 * returns.
 *
 * Copied, not sorted in place: `scope.data.campaigns` is the same array the
 * caller may hold, and a data loader that reorders its input is a surprise
 * waiting for the next reader.
 *
 * An unparseable created_at sorts LAST rather than throwing the comparator into
 * NaN, where the result depends on the engine's sort and the input order.
 */
function byNewestFirst(campaigns: CampaignRow[]): CampaignRow[] {
  const at = (row: CampaignRow) => {
    const time = Date.parse(row.created_at);
    return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
  };
  return [...campaigns].sort((a, b) => at(b) - at(a));
}

// classifyPostgrestError is deliberately not imported here; resolveScope
// already applies it, and loadSparklines above classifies nothing on purpose.
// If a future read is added to this file, classify it there rather than
// reaching for the degradation above.
