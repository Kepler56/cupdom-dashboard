import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();

// fetchOverview builds its own client from cookies, so the module is stubbed
// rather than the client injected. Same reasoning as campaignsFetch.test.ts.
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ rpc }),
}));

const { fetchOverview } = await import('@/lib/data/overview');

const range = {
  from: new Date('2026-08-08T00:00:00Z'),
  to: new Date('2026-08-10T12:00:00Z'),
  prevFrom: new Date('2026-08-06T00:00:00Z'),
  prevTo: new Date('2026-08-08T00:00:00Z'),
  hasPrevious: true,
};

/**
 * Answers every RPC with an empty success, except `failing` (if given), which
 * fails with a fixed code/message. `client_campaigns` always succeeds with no
 * campaigns, so `loadSparklines` never has a slug to ask about and this stub
 * never needs to answer `client_campaigns_daily`.
 */
const serve = (failing?: string) => {
  rpc.mockImplementation((fn: string) => {
    if (fn === 'client_campaigns') return Promise.resolve({ data: [], error: null });
    if (failing && fn === failing) {
      return Promise.resolve({ data: null, error: { code: '42P01', message: 'boom' } });
    }
    return Promise.resolve({ data: [], error: null });
  });
};

const load = () => fetchOverview({ range, preset: '30j', rawSlug: undefined });

beforeEach(() => {
  rpc.mockReset();
});

describe('fetchOverview — the failure gate is three reads, not six', () => {
  it('a failed insight read leaves the page standing, and does not take its neighbours with it', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    serve('client_scans_hourly');

    const result = await load();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.hourly).toBeNull();
    // The one failure must not null out the other two insight reads.
    expect(result.data.geo).toEqual([]);
    expect(result.data.tech).toEqual([]);
    warn.mockRestore();
  });

  it.each(['client_overview', 'client_scans_daily', 'client_funnel'])(
    'a failed %s still fails the whole page',
    async (failing) => {
      serve(failing);
      const result = await load();
      expect(result.ok).toBe(false);
    },
  );

  it('gives three arrays, not three nulls, when all six reads succeed', async () => {
    serve();
    const result = await load();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.hourly).toEqual([]);
    expect(result.data.geo).toEqual([]);
    expect(result.data.tech).toEqual([]);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
