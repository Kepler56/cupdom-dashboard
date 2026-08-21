import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
const from = vi.fn();

// fetchLeadsPage builds its own client from cookies, so the module is stubbed
// rather than the client injected. Same reasoning as campaignsFetch.test.ts
// and overviewFetch.test.ts.
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ rpc, from }),
}));

const { fetchLeadsPage } = await import('@/lib/data/leadsPage');

/**
 * A stub shaped like the PostgREST builder selectLeads chains onto: every
 * method returns `this` so calls chain, and the terminal call resolves via
 * `then`. Shape borrowed from tests/unit/leadsPage.test.ts.
 */
function builder(result: { data: unknown; count: number | null; error: unknown }) {
  const self: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'or', 'order', 'range', 'limit']) {
    self[m] = vi.fn(() => self);
  }
  self.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return self;
}

const load = (params: { tri?: string; q?: string; page?: string } = {}) =>
  fetchLeadsPage({ rawSlug: undefined, params });

beforeEach(() => {
  rpc.mockReset();
  from.mockReset();
});

describe('fetchLeadsPage', () => {
  it('returns a refused scope unchanged, and never queries the leads table', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'accès refusé' } });

    const result = await load();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.kind).toBe('refused');
    expect(from).not.toHaveBeenCalled();
  });

  it('surfaces a leads query error as a classified failure', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    from.mockReturnValue(builder({ data: null, count: null, error: { code: '42P01', message: 'boom' } }));

    const result = await load();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.kind).toBe('error');
  });

  it('reports a full page count of 1, never 0, when there are no rows to show', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    from.mockReturnValue(builder({ data: [], count: 0, error: null }));

    const result = await load();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.rows).toEqual([]);
    expect(result.data.total).toBe(0);
    expect(result.data.pages).toBe(1);
  });
});
