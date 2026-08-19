import type { CampaignRow } from './types';

export type GeoLevel = 'country' | 'region' | 'city' | 'venue';

const LEVELS = Object.freeze({
  venue: 'Lieux',
  country: 'Pays',
  region: 'Régions',
  city: 'Villes',
} as const satisfies Record<GeoLevel, string>);

/**
 * The default when no campaign in the selection carries a venue.
 *
 * City, not country: a French sponsor's country ranking is one bar reading
 * « France » — true and useless. The city cut is where the answer to
 * « où ? » actually lives.
 */
export const DEFAULT_GEO_LEVEL: GeoLevel = 'city';

/**
 * Venue first when there is one, city otherwise.
 *
 * Spec §4.3-B ranks the venue cut above the geographic one, because for a
 * nightlife sponsor « le Rex Club a fait 3× le Badaboum » beats « Paris =
 * 62 % ». Landing such a client on « Villes » puts the weaker answer in front
 * of them by default, and this module used to say both things at once:
 * `geoLevelsFor` offered venue first, calling it the cut a nightlife sponsor
 * buys, while the default pointed away from it.
 *
 * This is HALF of the spec's shape, deliberately. §4.3-B has the venue ranking
 * SIT ABOVE the geographic one — both visible at once — which needs a second
 * `client_scans_geo` call and its own card. That is a feature addition and is
 * recorded for stage 3B. Making the default venue-aware removes the commercial
 * harm now, in a few lines, without inventing that feature here.
 */
export function defaultGeoLevel(hasVenue: boolean): GeoLevel {
  return hasVenue ? 'venue' : DEFAULT_GEO_LEVEL;
}

/**
 * Note this is level SWITCHING, not drill-down. `client_scans_geo` takes only
 * `p_level` — there is no parent filter, so selecting « Régions » returns every
 * region across every country with no attribution, and clicking France cannot
 * narrow to French regions. Implementing a clickable drill-down on top of that
 * would be a lie about what the data says. See the plan's Known gaps for the
 * `p_parent` argument that would make real drill-down possible.
 */
export const GEO_LEVELS = Object.freeze(
  (['venue', 'country', 'region', 'city'] as const).map((id) => ({ id, label: LEVELS[id] })),
);

/**
 * Spec §4.8: a campaign carries at most one venue, so the ranking only means
 * something when at least one campaign in the selection has one. Otherwise the
 * RPC returns a single « Inconnu » bar, which reads as a broken screen.
 */
export function venueAvailable(campaigns: CampaignRow[]): boolean {
  return campaigns.some((c) => (c.venue ?? '').trim().length > 0);
}

/** The levels to offer, venue first when it exists — it is the cut a nightlife sponsor buys. */
export function geoLevelsFor(hasVenue: boolean) {
  return GEO_LEVELS.filter((l) => l.id !== 'venue' || hasVenue);
}

/** Read `?geo=`, refusing a level the current selection cannot answer. */
export function parseGeoLevel(raw: string | undefined, hasVenue: boolean): GeoLevel {
  const match = geoLevelsFor(hasVenue).find((l) => l.id === raw);
  return match ? match.id : defaultGeoLevel(hasVenue);
}
