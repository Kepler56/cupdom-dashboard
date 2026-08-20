import type { CampaignRow } from './types';

/**
 * Four members, not three: `levelParam` and the direct
 * `client_scans_geo(p_level => 'venue')` call still speak `'venue'` — it is
 * the venue card's own dimension now, not a member of the geography picker.
 * See GEO_LEVELS below for where it left.
 */
export type GeoLevel = 'country' | 'region' | 'city' | 'venue';

const LEVELS = Object.freeze({
  venue: 'Lieux',
  country: 'Pays',
  region: 'Régions',
  city: 'Villes',
} as const satisfies Record<GeoLevel, string>);

/**
 * City, not country: a French sponsor's country ranking is one bar reading
 * « France » — true and useless. The city cut is where the answer to « où ? »
 * actually lives.
 */
export const DEFAULT_GEO_LEVEL: GeoLevel = 'city';

export function defaultGeoLevel(): GeoLevel {
  return DEFAULT_GEO_LEVEL;
}

/**
 * The three cuts of ONE dimension — where the person was.
 *
 * `venue` is deliberately absent, and stage 3A's arrangement is worth
 * recording because it looked reasonable. It offered venue as a fourth tab,
 * which made the venue ranking and the city ranking mutually exclusive; spec
 * §4.3-B has them both on screen, venue above, because for a nightlife
 * sponsor « le Rex Club a fait 3× le Badaboum » and « Paris = 62 % » answer
 * different questions and the client wants both. Venue is now its own card,
 * fed by its own `client_scans_geo(p_level => 'venue')` call.
 *
 * Note this is level SWITCHING, not drill-down: `client_scans_geo` takes only
 * `p_level`, so selecting « Régions » returns every region across every
 * country with no attribution, and clicking France cannot narrow to French
 * regions. See the plan's Known gaps for the `p_parent` argument that would
 * fix it.
 */
export const GEO_LEVELS = Object.freeze(
  (['country', 'region', 'city'] as const).map((id) => ({ id, label: LEVELS[id] })),
);

/**
 * Spec §4.8: a campaign carries at most one venue, so the ranking only means
 * something when at least one campaign in the SELECTION has one. Otherwise
 * `client_scans_geo(p_level => 'venue')` answers with a single « Inconnu »
 * bar, which reads as a broken screen. Unchanged from stage 3A: it gated a
 * tab there and gates the card now.
 */
export function venueAvailable(campaigns: CampaignRow[]): boolean {
  return campaigns.some((c) => (c.venue ?? '').trim().length > 0);
}

/**
 * The levels to offer. Kept as a function rather than inlining `GEO_LEVELS`
 * at the call site: `GeoLevelPicker` takes a `levels` prop, and a named
 * accessor is where a future per-client restriction would go.
 */
export function geoLevelsFor() {
  return GEO_LEVELS;
}

/**
 * Read `?geo=`.
 *
 * `?geo=venue` was a valid URL in stage 3A and may be bookmarked. It falls
 * back to the default rather than erroring: a link that used to work should
 * degrade, not accuse.
 */
export function parseGeoLevel(raw: string | undefined): GeoLevel {
  const match = GEO_LEVELS.find((l) => l.id === raw);
  return match ? match.id : DEFAULT_GEO_LEVEL;
}
