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

describe('defaultGeoLevel', () => {
  it('lands a nightlife sponsor on the cut they actually bought', () => {
    expect(defaultGeoLevel(true)).toBe('venue');
  });

  it('falls back to the city cut when no campaign carries a venue', () => {
    expect(defaultGeoLevel(false)).toBe('city');
    expect(defaultGeoLevel(false)).toBe(DEFAULT_GEO_LEVEL);
  });
});

describe('parseGeoLevel', () => {
  it('accepts every known level', () => {
    expect(parseGeoLevel('country', false)).toBe('country');
    expect(parseGeoLevel('region', false)).toBe('region');
    expect(parseGeoLevel('city', false)).toBe('city');
  });

  it('falls back to the default on anything unrecognised', () => {
    expect(parseGeoLevel('département', false)).toBe(DEFAULT_GEO_LEVEL);
    expect(parseGeoLevel(undefined, false)).toBe(DEFAULT_GEO_LEVEL);
  });

  // Spec §4.3-B ranks the venue cut above the geographic one: « le Rex Club a
  // fait 3× le Badaboum » is what a nightlife sponsor buys. Defaulting them to
  // « Villes » put the weaker answer in front of them.
  it('defaults to the venue cut when the selection has venues', () => {
    expect(parseGeoLevel(undefined, true)).toBe('venue');
    expect(parseGeoLevel('arrondissement', true)).toBe('venue');
  });

  // Asking the RPC for a venue ranking when no campaign has one returns a
  // single « Inconnu » bar, which looks like a bug. The URL cannot select it.
  it('refuses the venue level when no campaign carries a venue', () => {
    expect(parseGeoLevel('venue', false)).toBe(DEFAULT_GEO_LEVEL);
  });

  it('allows the venue level when one does', () => {
    expect(parseGeoLevel('venue', true)).toBe('venue');
  });
});

describe('geoLevelsFor', () => {
  it('offers three levels without venues', () => {
    expect(geoLevelsFor(false).map((l) => l.id)).toEqual(['country', 'region', 'city']);
  });

  it('offers four with them, venue first — it is the commercially useful cut', () => {
    expect(geoLevelsFor(true).map((l) => l.id)).toEqual(['venue', 'country', 'region', 'city']);
  });

  it('labels every level in French', () => {
    expect(geoLevelsFor(true).map((l) => l.label)).toEqual(['Lieux', 'Pays', 'Régions', 'Villes']);
  });
});
