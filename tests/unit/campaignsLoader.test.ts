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
    const out = await loadSparklines(client, range, ['rex', 'bada']);
    expect(Object.keys(out).sort()).toEqual(['bada', 'rex']);
    expect(out.bada.values.every((v) => v === 0)).toBe(true);
  });

  it('degrades to no curves when the migration has not been applied', async () => {
    // PostgREST answers an unknown RPC with PGRST202, not a Postgres SQLSTATE.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = stub({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } });
    await expect(loadSparklines(client, range, ['rex'])).resolves.toEqual({});
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('degrades on the Postgres undefined_function code too', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = stub({ data: null, error: { code: '42883', message: 'function does not exist' } });
    await expect(loadSparklines(client, range, ['rex'])).resolves.toEqual({});
    warn.mockRestore();
  });

  it('degrades on ANY other error rather than taking the page down with it', async () => {
    // The curve is an ornament beside numbers that are already correct and
    // already on screen. Nothing here is allowed to reach the user as
    // « Chargement impossible » — including a refusal, which the campaign list
    // fetched a moment earlier would already have caught.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = stub({ data: null, error: { code: '42501', message: 'accès refusé' } });
    await expect(loadSparklines(client, range, ['rex'])).resolves.toEqual({});
    warn.mockRestore();
  });

  it('asks for no curves at all when there are no campaigns', async () => {
    const client = stub({ data: [], error: null });
    await expect(loadSparklines(client, range, [])).resolves.toEqual({});
    expect((client as unknown as { rpc: ReturnType<typeof vi.fn> }).rpc).not.toHaveBeenCalled();
  });
});
