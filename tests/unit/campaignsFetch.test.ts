import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CampaignRow } from '@/lib/analytics/types';

const rpc = vi.fn();

// fetchCampaigns builds its own client from cookies, so the module is stubbed
// rather than the client injected.
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ rpc }),
}));

const { fetchCampaigns } = await import('@/lib/data/campaigns');

const range = {
  from: new Date('2026-08-08T00:00:00Z'),
  to: new Date('2026-08-10T12:00:00Z'),
  prevFrom: new Date('2026-08-06T00:00:00Z'),
  prevTo: new Date('2026-08-08T00:00:00Z'),
  hasPrevious: true,
};

const campaign = (slug: string, created_at: string): CampaignRow => ({
  slug,
  name: slug,
  sponsor_name: 'Nike',
  product: null,
  destination_url: 'https://example.test',
  active: true,
  venue: null,
  distributed_count: null,
  invested_amount_eur: null,
  created_at,
  scans: 0,
  uniques: 0,
  leads: 0,
});

const serve = (campaigns: CampaignRow[]) => {
  rpc.mockImplementation((fn: string) => {
    if (fn === 'client_campaigns') return Promise.resolve({ data: campaigns, error: null });
    return Promise.resolve({ data: [], error: null });
  });
};

const order = async (campaigns: CampaignRow[]) => {
  serve(campaigns);
  const result = await fetchCampaigns({ range, preset: '30j' });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('unreachable');
  return result.data.campaigns.map((c) => c.slug);
};

beforeEach(() => {
  rpc.mockReset();
});

/**
 * /campagnes tells the client « Les plus récentes d'abord ». Nothing enforced
 * it: the order was whatever client_campaigns() happened to return, and that
 * function lives in the other repository, which deploys independently.
 */
describe('fetchCampaigns — the stated ordering is enforced here, not assumed', () => {
  it('returns the newest campaign first whatever order the RPC used', async () => {
    expect(
      await order([
        campaign('vieille', '2026-01-04T00:00:00Z'),
        campaign('recente', '2026-08-01T00:00:00Z'),
        campaign('moyenne', '2026-05-20T00:00:00Z'),
      ]),
    ).toEqual(['recente', 'moyenne', 'vieille']);
  });

  it('is not fooled by an RPC that already sorted the other way', async () => {
    expect(
      await order([
        campaign('a', '2026-01-01T00:00:00Z'),
        campaign('b', '2026-02-01T00:00:00Z'),
        campaign('c', '2026-03-01T00:00:00Z'),
      ]),
    ).toEqual(['c', 'b', 'a']);
  });

  it('compares instants, not strings, so a different offset still sorts right', async () => {
    // 2026-08-01T00:30+02:00 is 2026-07-31T22:30Z — EARLIER than the other,
    // although it sorts later as text.
    expect(
      await order([campaign('paris', '2026-08-01T00:30:00+02:00'), campaign('utc', '2026-07-31T23:00:00Z')]),
    ).toEqual(['utc', 'paris']);
  });

  it('puts an unparseable created_at last rather than scrambling the sort', async () => {
    expect(
      await order([
        campaign('cassee', 'pas une date'),
        campaign('vieille', '2026-01-01T00:00:00Z'),
        campaign('recente', '2026-08-01T00:00:00Z'),
      ]),
    ).toEqual(['recente', 'vieille', 'cassee']);
  });

  it('does not reorder the array the scope handed it', async () => {
    const rows = [campaign('a', '2026-01-01T00:00:00Z'), campaign('b', '2026-08-01T00:00:00Z')];
    serve(rows);
    await fetchCampaigns({ range, preset: '30j' });
    expect(rows.map((c) => c.slug)).toEqual(['a', 'b']);
  });
});

describe('fetchCampaigns — the preset reaches the sparkline loader', () => {
  it('asks for the curves of the campaigns it is about to render', async () => {
    serve([campaign('b', '2026-08-01T00:00:00Z'), campaign('a', '2026-01-01T00:00:00Z')]);
    const result = await fetchCampaigns({ range, preset: 'tout' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.data.sparklines).sort()).toEqual(['a', 'b']);
  });

  it('surfaces a refused campaign list rather than an empty page', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'accès refusé' } });
    const result = await fetchCampaigns({ range, preset: '30j' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.kind).toBe('refused');
  });
});
