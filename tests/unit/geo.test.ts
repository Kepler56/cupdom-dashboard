import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GEO_LEVEL,
  defaultGeoLevel,
  geoLevelsFor,
  parseGeoLevel,
  venueAvailable,
} from '@/lib/analytics/geo';
import type { CampaignRow } from '@/lib/analytics/types';

const campaign = (venue: string | null): CampaignRow => ({
  slug: 's',
  name: 'n',
  sponsor_name: 'Nike',
  product: null,
  destination_url: 'https://example.test',
  active: true,
  venue,
  distributed_count: null,
  invested_amount_eur: null,
  created_at: '2026-07-01T00:00:00Z',
  scans: 0,
  uniques: 0,
  leads: 0,
});

describe('venueAvailable', () => {
  it('is true when at least one campaign carries a venue', () => {
    expect(venueAvailable([campaign(null), campaign('Rex Club')])).toBe(true);
  });

  // Spec §4.8: the ranking is hidden entirely when no campaign in the selection
  // carries a venue — otherwise it is a table of one row reading « Inconnu ».
  it('is false when none does', () => {
    expect(venueAvailable([campaign(null), campaign(null)])).toBe(false);
  });

  it('is false for an empty selection', () => {
    expect(venueAvailable([])).toBe(false);
  });

  it('ignores a venue that is only whitespace', () => {
    expect(venueAvailable([campaign('   ')])).toBe(false);
  });
});

// Stage 3B: venue left the geography picker to become its own card (spec
// §4.3-B). `GeoLevel` still has a 'venue' member for `levelParam` and the
// direct `client_scans_geo(p_level => 'venue')` call, but the three functions
// below now only ever offer or resolve to the three GEOGRAPHIC cuts.
describe('defaultGeoLevel', () => {
  it('defaults to villes, because a French sponsor’s country ranking is one bar', () => {
    expect(defaultGeoLevel()).toBe('city');
    expect(defaultGeoLevel()).toBe(DEFAULT_GEO_LEVEL);
  });
});

describe('parseGeoLevel', () => {
  it('accepts every known geographic level', () => {
    expect(parseGeoLevel('country')).toBe('country');
    expect(parseGeoLevel('region')).toBe('region');
    expect(parseGeoLevel('city')).toBe('city');
  });

  it('falls back to the default on anything unrecognised', () => {
    expect(parseGeoLevel('département')).toBe(DEFAULT_GEO_LEVEL);
    expect(parseGeoLevel(undefined)).toBe(DEFAULT_GEO_LEVEL);
  });

  it('no longer accepts venue as a LEVEL — it is its own dimension now', () => {
    // ?geo=venue was a valid URL in stage 3A. It must degrade to the default
    // rather than 404 or throw: a bookmarked link is not an error.
    expect(parseGeoLevel('venue')).toBe('city');
  });
});

describe('geoLevelsFor', () => {
  it('offers only the three geographic cuts', () => {
    expect(geoLevelsFor().map((l) => l.id)).toEqual(['country', 'region', 'city']);
  });

  it('labels every level in French', () => {
    expect(geoLevelsFor().map((l) => l.label)).toEqual(['Pays', 'Régions', 'Villes']);
  });
});
