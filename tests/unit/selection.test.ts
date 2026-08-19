import { describe, expect, it } from 'vitest';
import { parseCampaign, selectedCampaigns } from '@/lib/analytics/selection';
import type { CampaignRow } from '@/lib/analytics/types';

const campaign = (slug: string): CampaignRow => ({
  slug,
  name: slug,
  sponsor_name: 'Nike',
  product: null,
  destination_url: 'https://example.test',
  active: true,
  venue: null,
  distributed_count: null,
  invested_amount_eur: null,
  created_at: '2026-07-01T00:00:00Z',
  scans: 0,
  uniques: 0,
  leads: 0,
});

describe('parseCampaign', () => {
  it('keeps a slug the client actually owns', () => {
    expect(parseCampaign('nike-ete', ['nike-ete', 'nike-hiver'])).toBe('nike-ete');
  });

  // Passing an unowned slug to the RPC raises insufficient_privilege, which
  // would paint "Accès refusé" over what is usually a mistyped URL. A filter is
  // not a route: an unrecognised value falls back to "all campaigns".
  it('falls back to all campaigns on an unknown slug', () => {
    expect(parseCampaign('someone-elses', ['nike-ete'])).toBeNull();
  });

  it('falls back to all campaigns when the parameter is absent', () => {
    expect(parseCampaign(undefined, ['nike-ete'])).toBeNull();
  });

  it('falls back to all campaigns on an empty parameter', () => {
    expect(parseCampaign('', ['nike-ete'])).toBeNull();
  });
});

describe('selectedCampaigns', () => {
  it('returns every campaign when nothing is filtered', () => {
    expect(selectedCampaigns([campaign('a'), campaign('b')], null)).toHaveLength(2);
  });

  it('narrows to the filtered campaign', () => {
    expect(selectedCampaigns([campaign('a'), campaign('b')], 'b').map((c) => c.slug)).toEqual(['b']);
  });
});
