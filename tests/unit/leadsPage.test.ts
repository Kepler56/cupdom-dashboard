import { describe, expect, it, vi } from 'vitest';
import { selectLeads } from '@/lib/data/leadsPage';
import { parseLeadsQuery } from '@/lib/analytics/leadsQuery';

/**
 * A stub shaped like the PostgREST builder: every method returns `this` so calls
 * chain, and the terminal `range`/`limit` resolves. We assert on what was CALLED,
 * because that is the contract with the database.
 */
function builder() {
  const calls: { method: string; args: unknown[] }[] = [];
  const self: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'or', 'order', 'range', 'limit']) {
    self[m] = vi.fn((...args: unknown[]) => {
      calls.push({ method: m, args });
      return self;
    });
  }
  self.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], count: 0, error: null });
  return { self, calls, client: { from: vi.fn(() => self) } };
}

const called = (calls: { method: string; args: unknown[] }[], m: string) =>
  calls.filter((c) => c.method === m).map((c) => c.args);

describe('selectLeads', () => {
  it('never selects * from a table of personal data', async () => {
    const b = builder();
    await selectLeads(b.client as never, { query: parseLeadsQuery({}), slug: null });
    const [columns] = called(b.calls, 'select')[0] as [string];
    expect(columns).not.toContain('*');
    expect(columns.split(',').map((c) => c.trim()).sort()).toEqual(
      ['campaign_slug', 'email', 'first_name', 'first_seen_at', 'id', 'last_name', 'phone'],
    );
  });

  it('asks for an exact count, so pagination can be honest', async () => {
    const b = builder();
    await selectLeads(b.client as never, { query: parseLeadsQuery({}), slug: null });
    const [, options] = called(b.calls, 'select')[0] as [string, { count: string }];
    expect(options.count).toBe('exact');
  });

  it('narrows to one campaign when the filter is set, and not otherwise', async () => {
    const withSlug = builder();
    await selectLeads(withSlug.client as never, { query: parseLeadsQuery({}), slug: 'demo-rex-club' });
    expect(called(withSlug.calls, 'eq')).toEqual([['campaign_slug', 'demo-rex-club']]);

    const without = builder();
    await selectLeads(without.client as never, { query: parseLeadsQuery({}), slug: null });
    expect(called(without.calls, 'eq')).toEqual([]);
  });

  it('applies the sanitised search across the three name/email columns', async () => {
    const b = builder();
    await selectLeads(b.client as never, { query: parseLeadsQuery({ q: 'durand' }), slug: null });
    expect(called(b.calls, 'or')).toEqual([
      ['first_name.ilike.*durand*,last_name.ilike.*durand*,email.ilike.*durand*'],
    ]);
  });

  it('does not call or() at all when there is no usable search', async () => {
    const b = builder();
    await selectLeads(b.client as never, { query: parseLeadsQuery({ q: ',,,' }), slug: null });
    expect(called(b.calls, 'or')).toEqual([]);
  });

  it('sinks anonymised rows to the bottom whichever way the column is sorted', async () => {
    // last_name is NULL on an anonymised lead. Postgres would put those FIRST on
    // a descending sort, so a sponsor sorting by name would open their contact
    // list on a screen of « Contact anonymisé ». nullsFirst: false, always.
    for (const tri of ['nom.asc', 'nom.desc']) {
      const b = builder();
      await selectLeads(b.client as never, { query: parseLeadsQuery({ tri }), slug: null });
      const [, options] = called(b.calls, 'order')[0] as [string, { nullsFirst: boolean }];
      expect(options.nullsFirst).toBe(false);
    }
  });

  it('breaks ties on id so a row cannot appear on two pages', async () => {
    // Without a deterministic tiebreak, two rows with the same first_seen_at can
    // swap between requests — one shows up twice, another never.
    const b = builder();
    await selectLeads(b.client as never, { query: parseLeadsQuery({}), slug: null });
    const orders = called(b.calls, 'order');
    expect(orders).toHaveLength(2);
    expect(orders[0][0]).toBe('first_seen_at');
    expect(orders[1][0]).toBe('id');
  });

  it('ranges to the requested page', async () => {
    const b = builder();
    await selectLeads(b.client as never, { query: parseLeadsQuery({ page: '3' }), slug: null });
    expect(called(b.calls, 'range')).toEqual([[100, 149]]);
  });

  it('takes a limit instead of a range when the caller is the export', async () => {
    const b = builder();
    await selectLeads(b.client as never, { query: parseLeadsQuery({}), slug: null, limit: 5000 });
    expect(called(b.calls, 'limit')).toEqual([[5000]]);
    expect(called(b.calls, 'range')).toEqual([]);
  });

  it('reads the leads table, which no other assertion in this file pins', () => {
    const b = builder();
    selectLeads(b.client as never, { query: parseLeadsQuery({}), slug: null });
    expect(b.client.from).toHaveBeenCalledWith('leads');
  });
});
