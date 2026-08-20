import { describe, expect, it } from 'vitest';
import { ownedCampaign } from '@/lib/data/campaign';
import type { CampaignRow } from '@/lib/analytics/types';

const campaign = (slug: string): CampaignRow => ({
  slug,
  name: `Campagne ${slug}`,
  sponsor_name: 'Démo Nightlife',
  product: null,
  destination_url: 'https://demo-nightlife.test/rex',
  active: true,
  venue: null,
  distributed_count: 100,
  invested_amount_eur: null,
  created_at: '2026-05-17T09:30:00Z',
  scans: 0,
  uniques: 0,
  leads: 0,
});

describe('ownedCampaign', () => {
  it('returns the campaign when the slug is in the roster', () => {
    const roster = [campaign('rex-club'), campaign('badaboum')];
    expect(ownedCampaign(roster, 'badaboum')).toEqual(campaign('badaboum'));
  });

  it('returns null for a slug absent from the roster', () => {
    const roster = [campaign('rex-club')];
    expect(ownedCampaign(roster, 'not-mine')).toBeNull();
  });

  it('returns null against an empty roster', () => {
    expect(ownedCampaign([], 'rex-club')).toBeNull();
  });

  it('does not partially match a prefix or suffix of an owned slug', () => {
    const roster = [campaign('rex-club')];
    expect(ownedCampaign(roster, 'rex-club-2')).toBeNull();
    expect(ownedCampaign(roster, 'x-rex-club')).toBeNull();
  });
});
