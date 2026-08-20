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
  /**
   * Whether to render the « Lieux / événements » card. False both when no
   * campaign in the selection carries a venue AND when the venue read failed:
   * a hidden card is honest, an empty one claims nobody scanned there.
   */
  hasVenue: boolean;
  geo: GeoRow[];
  venue: GeoRow[];
  hourly: HourlyRow[];
  tech: TechRow[];
}

// Placeholder for the skipped venue call — typed explicitly so it stays
// assignable alongside a real PostgrestBuilder response rather than reaching
// for `as any`.
const NO_ROWS: { data: GeoRow[]; error: null } = { data: [], error: null };

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
  const level = parseGeoLevel(args.rawLevel);

  const from = args.range.from.toISOString();
  const to = args.range.to.toISOString();

  const [geo, venue, hourly, tech] = await Promise.all([
    supabase.rpc('client_scans_geo', { p_from: from, p_to: to, p_slug: slug, p_level: levelParam(level) }),
    // Spec §4.3-B: the venue ranking sits ABOVE geography, not instead of it, so
    // this is a second call rather than a different p_level on the first. Skipped
    // entirely when no campaign in the selection carries a venue — the RPC would
    // answer with a single « Inconnu » bar and the card is hidden anyway.
    hasVenue
      ? supabase.rpc('client_scans_geo', { p_from: from, p_to: to, p_slug: slug, p_level: levelParam('venue') })
      : Promise.resolve(NO_ROWS),
    supabase.rpc('client_scans_hourly', { p_from: from, p_to: to, p_slug: slug }),
    supabase.rpc('client_scans_tech', { p_from: from, p_to: to, p_slug: slug }),
  ]);

  // THREE reads in this gate, not four. geo, hourly and tech ARE the page: « Où »,
  // « Quand » and « Comment » are the whole of Audience, and a zero drawn in
  // place of a failed read is a more expensive lie than an error screen — spec
  // §6, and the rule the rest of lib/data follows.
  //
  // The venue ranking is the exception, for the reason lib/data/campaigns.ts
  // argues at length about the sparklines: it is one supplementary card beside
  // three that already answered correctly, and taking the geographic ranking,
  // the heatmap and the technology breakdown down to admit that ONE card is
  // missing trades a working page for a scary one. The risk is new to this
  // branch, too — before it, this RPC only ran when the user picked the venue
  // tab; now it runs on every load for any venue-carrying client, so a fault in
  // it reaches everybody rather than the few who clicked.
  //
  // Degrading means HIDING the card, not drawing it empty: an empty ranking
  // beside « Lieux / événements » reads as « nobody scanned at the Rex Club »,
  // which is the false zero the failure gate exists to prevent. And it warns to
  // the server log, because silence here would hide a broken read for as long
  // as nobody looked at the card.
  const failed = [geo, hourly, tech].find((r) => r.error);
  if (failed) return { ok: false, failure: classifyPostgrestError(failed.error) };

  if (venue.error) {
    console.warn(
      '[portail] client_scans_geo(venue) indisponible, carte Lieux masquée:',
      venue.error.code,
      venue.error.message,
    );
  }

  return {
    ok: true,
    data: {
      campaigns,
      slug,
      level,
      hasVenue: hasVenue && !venue.error,
      geo: (geo.data ?? []) as GeoRow[],
      venue: venue.error ? [] : ((venue.data ?? []) as GeoRow[]),
      hourly: (hourly.data ?? []) as HourlyRow[],
      tech: (tech.data ?? []) as TechRow[],
    },
  };
}
