import { selectedCampaigns } from '@/lib/analytics/selection';
import type { GeoLevel } from '@/lib/analytics/geo';
import { parseGeoLevel, venueAvailable } from '@/lib/analytics/geo';
import type { CampaignRow, GeoRow, HourlyRow, TechRow } from '@/lib/analytics/types';
import type { PeriodRange } from '@/lib/period';
import { createServerClient } from '@/lib/supabase/server';
import { classifyPostgrestError, type DataResult } from './result';
import { resolveScope } from './scope';
import { levelParam } from './scopeParams';

export interface AudienceData {
  campaigns: CampaignRow[];
  slug: string | null;
  level: GeoLevel;
  hasVenue: boolean;
  geo: GeoRow[];
  hourly: HourlyRow[];
  tech: TechRow[];
}

export async function fetchAudience(args: {
  range: PeriodRange;
  rawSlug: string | undefined;
  rawLevel: string | undefined;
}): Promise<DataResult<AudienceData>> {
  const supabase = await createServerClient();

  const scope = await resolveScope(supabase, args.rawSlug);
  if (!scope.ok) return scope;
  const { campaigns, slug } = scope.data;

  // The venue level only exists when a campaign in scope carries one, so the
  // level cannot be resolved until the campaign list is in hand. This must be
  // asked of the SELECTION, not the whole roster: a client with one venue
  // campaign elsewhere in their roster who filters to a venue-less one would
  // otherwise still be offered "Lieux", and client_scans_geo(p_level =>
  // 'venue') would answer with a single "Inconnu" bar — the exact broken-
  // looking screen venueAvailable exists to prevent, arriving through the
  // unfiltered roster instead of the URL. selectedCampaigns(campaigns, null)
  // returns everything, so the unfiltered case is unaffected.
  const scoped = selectedCampaigns(campaigns, slug);
  const hasVenue = venueAvailable(scoped);
  const level = parseGeoLevel(args.rawLevel, hasVenue);

  const from = args.range.from.toISOString();
  const to = args.range.to.toISOString();

  const [geo, hourly, tech] = await Promise.all([
    supabase.rpc('client_scans_geo', { p_from: from, p_to: to, p_slug: slug, p_level: levelParam(level) }),
    supabase.rpc('client_scans_hourly', { p_from: from, p_to: to, p_slug: slug }),
    supabase.rpc('client_scans_tech', { p_from: from, p_to: to, p_slug: slug }),
  ]);

  const failed = [geo, hourly, tech].find((r) => r.error);
  if (failed) return { ok: false, failure: classifyPostgrestError(failed.error) };

  return {
    ok: true,
    data: {
      campaigns,
      slug,
      level,
      hasVenue,
      geo: (geo.data ?? []) as GeoRow[],
      hourly: (hourly.data ?? []) as HourlyRow[],
      tech: (tech.data ?? []) as TechRow[],
    },
  };
}
