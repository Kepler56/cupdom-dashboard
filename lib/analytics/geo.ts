import type { CampaignRow } from './types';

export type GeoLevel = 'country' | 'region' | 'city' | 'venue';

const LEVELS = Object.freeze({
  venue: 'Lieux',
  country: 'Pays',
  region: 'Régions',
  city: 'Villes',
} as const satisfies Record<GeoLevel, string>);

/**
 * City is the default, not country.
 *
 * A French sponsor's country ranking is one bar reading « France » — true and
 * useless. The city cut is where the answer to « où ? » actually lives.
 */
export const DEFAULT_GEO_LEVEL: GeoLevel = 'city';

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
  return match ? match.id : DEFAULT_GEO_LEVEL;
}
