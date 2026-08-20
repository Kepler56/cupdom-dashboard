import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();

// fetchAudience builds its own client from cookies, so the module is stubbed
// rather than the client injected. Everything else in the function — the
// venue gating, the failure gate, the degradation — is exercised for real.
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ rpc }),
}));

const { fetchAudience } = await import('@/lib/data/audience');

const range = {
  from: new Date('2026-08-08T00:00:00Z'),
  to: new Date('2026-08-10T12:00:00Z'),
  prevFrom: new Date('2026-08-06T00:00:00Z'),
  prevTo: new Date('2026-08-08T00:00:00Z'),
  hasPrevious: true,
};

const CAMPAIGNS = [
  {
    slug: 'demo-rex-club',
    name: 'Rex Club',
    sponsor_name: 'Nike',
    product: null,
    destination_url: 'https://example.test',
    active: true,
    venue: 'Rex Club',
    distributed_count: null,
    invested_amount_eur: null,
    created_at: '2026-07-01T00:00:00Z',
    scans: 0,
    uniques: 0,
    leads: 0,
  },
];

const ok = (data: unknown) => ({ data, error: null });

/**
 * Route each RPC by name — and, for client_scans_geo, by p_level, since the
 * page now calls it twice with different levels.
 */
const route = (over: { venue?: unknown; geo?: unknown; hourly?: unknown; tech?: unknown } = {}) => {
  rpc.mockImplementation((fn: string, args?: { p_level?: string }) => {
    if (fn === 'client_campaigns') return Promise.resolve(ok(CAMPAIGNS));
    if (fn === 'client_scans_geo') {
      if (args?.p_level === 'venue') return Promise.resolve(over.venue ?? ok([{ label: 'Rex Club', scans: 40, uniques: 30 }]));
      return Promise.resolve(over.geo ?? ok([{ label: 'Paris', scans: 90, uniques: 70 }]));
    }
    if (fn === 'client_scans_hourly') return Promise.resolve(over.hourly ?? ok([]));
    if (fn === 'client_scans_tech') return Promise.resolve(over.tech ?? ok([]));
    throw new Error(`unexpected rpc ${fn}`);
  });
};

const call = () => fetchAudience({ range, rawSlug: undefined, rawLevel: undefined });

beforeEach(() => {
  rpc.mockReset();
});

describe('fetchAudience — the venue ranking is a supplement, not the page', () => {
  it('renders the card when the venue read succeeds', async () => {
    route();
    const result = await call();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.hasVenue).toBe(true);
    expect(result.data.venue).toHaveLength(1);
  });

  it('hides the venue card rather than blackening a page whose other reads worked', async () => {
    // Before this branch the venue RPC only ran when the user picked the venue
    // tab; it now runs on every load for any venue-carrying client, so folding
    // it into the failure gate meant one supplementary read could take down the
    // geographic ranking, the heatmap and the technology breakdown.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    route({ venue: { data: null, error: { code: 'PGRST202', message: 'Could not find the function' } } });

    const result = await call();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The three reads that ARE the page survive intact.
    expect(result.data.geo).toEqual([{ label: 'Paris', scans: 90, uniques: 70 }]);
    // Hidden, not drawn empty: an empty « Lieux » ranking reads as « nobody
    // scanned at the Rex Club », which is the false zero §6 forbids.
    expect(result.data.hasVenue).toBe(false);
    expect(result.data.venue).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('degrades on a refusal too, since the campaign list already caught a real one', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    route({ venue: { data: null, error: { code: '42501', message: 'accès refusé' } } });

    const result = await call();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.hasVenue).toBe(false);
    warn.mockRestore();
  });

  it('logs the code and the message, so a broken read is not silent', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    route({ venue: { data: null, error: { code: '42883', message: 'function does not exist' } } });

    await call();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Lieux'), '42883', 'function does not exist');
    warn.mockRestore();
  });
});

describe('fetchAudience — the three reads that ARE the page still fail it', () => {
  it.each([['geo'], ['hourly'], ['tech']] as const)('fails the page when %s fails', async (which) => {
    route({ [which]: { data: null, error: { code: '08006', message: 'connection failure' } } });

    const result = await call();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.kind).toBe('error');
  });

  it('still renders « Accès refusé » rather than an empty dashboard', async () => {
    route({ geo: { data: null, error: { code: '42501', message: 'accès refusé' } } });

    const result = await call();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.kind).toBe('refused');
  });
});

describe('fetchAudience — the venue level goes through levelParam', () => {
  it('never hand-writes the level string at the last call site that did', async () => {
    route();
    await call();

    // levelParam is the documented last line of defence against a typo reaching
    // Postgres, where client_scans_geo raises invalid_parameter_value and the
    // portal paints « Chargement impossible » over it.
    expect(rpc).toHaveBeenCalledWith('client_scans_geo', expect.objectContaining({ p_level: 'venue' }));
    expect(rpc).toHaveBeenCalledWith('client_scans_geo', expect.objectContaining({ p_level: 'city' }));
  });

  it('skips the venue call entirely when no campaign in the selection carries one', async () => {
    rpc.mockImplementation((fn: string) => {
      if (fn === 'client_campaigns') return Promise.resolve(ok([{ ...CAMPAIGNS[0], venue: null }]));
      return Promise.resolve(ok([]));
    });

    const result = await call();

    expect(result.ok).toBe(true);
    const geoCalls = rpc.mock.calls.filter(([fn]) => fn === 'client_scans_geo');
    expect(geoCalls).toHaveLength(1);
    expect(geoCalls[0][1].p_level).toBe('city');
  });
});
