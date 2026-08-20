import { describe, expect, it, vi } from 'vitest';
import { loadSparklines } from '@/lib/data/campaigns';

const range = {
  from: new Date('2026-08-08T00:00:00Z'),
  to: new Date('2026-08-10T12:00:00Z'),
  prevFrom: new Date('2026-08-06T00:00:00Z'),
  prevTo: new Date('2026-08-08T00:00:00Z'),
  hasPrevious: true,
};

/** The shape `supabase.rpc()` resolves to — data OR error, never both. */
const stub = (response: unknown) => ({ rpc: vi.fn().mockResolvedValue(response) }) as never;

describe('loadSparklines', () => {
  it('returns one entry per requested slug, even for a silent campaign', async () => {
    const client = stub({ data: [{ slug: 'rex', day: '2026-08-08', scans: 4 }], error: null });
    const out = await loadSparklines(client, range, '30j', ['rex', 'bada']);
    expect(Object.keys(out).sort()).toEqual(['bada', 'rex']);
    expect(out.bada.values.every((v) => v === 0)).toBe(true);
  });

  it('degrades to no curves when the migration has not been applied', async () => {
    // PostgREST answers an unknown RPC with PGRST202, not a Postgres SQLSTATE.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = stub({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } });
    await expect(loadSparklines(client, range, '30j', ['rex'])).resolves.toEqual({});
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('degrades on the Postgres undefined_function code too', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = stub({ data: null, error: { code: '42883', message: 'function does not exist' } });
    await expect(loadSparklines(client, range, '30j', ['rex'])).resolves.toEqual({});
    warn.mockRestore();
  });

  it('degrades on ANY other error rather than taking the page down with it', async () => {
    // The curve is an ornament beside numbers that are already correct and
    // already on screen. Nothing here is allowed to reach the user as
    // « Chargement impossible » — including a refusal, which the campaign list
    // fetched a moment earlier would already have caught.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = stub({ data: null, error: { code: '42501', message: 'accès refusé' } });
    await expect(loadSparklines(client, range, '30j', ['rex'])).resolves.toEqual({});
    warn.mockRestore();
  });

  it('asks for no curves at all when there are no campaigns', async () => {
    const client = stub({ data: [], error: null });
    await expect(loadSparklines(client, range, '30j', [])).resolves.toEqual({});
    expect((client as unknown as { rpc: ReturnType<typeof vi.fn> }).rpc).not.toHaveBeenCalled();
  });
});

/**
 * The window's opening day is decided by the PRESET, not by `hasPrevious`.
 *
 * The two coincide today only because 'tout' happens to be the one preset
 * without a prior window — a property of the trend comparison, not of the
 * series. app/(portal)/page.tsx already refuses that proxy in those words for
 * its own fillDailySeries call; these tests hold the loader to the same rule so
 * the two files cannot drift.
 */
describe('loadSparklines — the « tout » window opens where the data starts', () => {
  const rows = [
    { slug: 'rex', day: '2026-08-08', scans: 4 },
    { slug: 'rex', day: '2026-08-10', scans: 6 },
  ];

  // resolvePeriod('tout') hands back the epoch as `from`, and hasPrevious false.
  const toutRange = { ...range, from: new Date(0), prevFrom: new Date(0), prevTo: new Date(0), hasPrevious: false };

  it('starts at the first day with data under « tout », not in 1970', async () => {
    const client = stub({ data: rows, error: null });
    const out = await loadSparklines(client, toutRange, 'tout', ['rex']);
    expect(out.rex.values).toEqual([4, 0, 6]);
  });

  it('keeps the requested window under a dated preset', async () => {
    const client = stub({ data: rows, error: null });
    const out = await loadSparklines(client, range, '30j', ['rex']);
    // range.from is the 8th, so the window is the same three days here — what
    // matters is that the preset, not hasPrevious, chose it.
    expect(out.rex.values).toEqual([4, 0, 6]);
  });

  it('would truncate the curve if a future dated preset ever lost its prior window', async () => {
    // The regression this guards: a preset that is NOT 'tout' but happens to
    // have hasPrevious === false. The old `range.hasPrevious ? range.from :
    // null` read that as « tout » and opened the window at the data instead of
    // at the requested date — silently, with nothing failing anywhere.
    const client = stub({ data: rows, error: null });
    const noPrevious = { ...range, from: new Date('2026-08-09T00:00:00Z'), hasPrevious: false };
    const out = await loadSparklines(client, noPrevious, '30j', ['rex']);
    // Two days, from the 9th — NOT the three the data spans.
    expect(out.rex.values).toEqual([0, 6]);
  });
});
