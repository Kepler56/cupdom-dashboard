import { describe, expect, it } from 'vitest';
import {
  MAX_SEARCH_LENGTH,
  PAGE_SIZE,
  pageCount,
  parseLeadsQuery,
  sanitiseSearch,
  searchFilter,
  sortParam,
} from '@/lib/analytics/leadsQuery';

describe('sanitiseSearch', () => {
  it('keeps what a person actually types into a contact search', () => {
    expect(sanitiseSearch('Camille Durand')).toBe('Camille Durand');
    expect(sanitiseSearch('camille.durand@example.test')).toBe('camille.durand@example.test');
    expect(sanitiseSearch('Élodie')).toBe('Élodie');
    expect(sanitiseSearch("O'Brien")).toBe("O'Brien");
    expect(sanitiseSearch('Jean-Luc')).toBe('Jean-Luc');
  });

  it('strips PostgREST filter syntax — the whole point of this function', () => {
    // `.or()` takes a string PostgREST parses as filters. A comma or a paren
    // that survives here lets the caller choose which filters run.
    expect(sanitiseSearch('a,b')).toBe('ab');
    expect(sanitiseSearch('a(b)c')).toBe('abc');
    expect(sanitiseSearch('a*b')).toBe('ab');
    // `.` is kept, not stripped: it is needed for email search (see the test
    // above) and, unlike `,` `(` `)` `*`, a lone dot inside a filter VALUE
    // cannot open a new column/operator — only a comma does that. So this
    // string, which contains no comma/paren/star, survives unchanged.
    expect(sanitiseSearch('phone.not.is.null')).toBe('phone.not.is.null');
  });

  it('collapses whitespace and trims', () => {
    expect(sanitiseSearch('  Camille   Durand  ')).toBe('Camille Durand');
  });

  it('truncates rather than letting an unbounded string reach the database', () => {
    expect(sanitiseSearch('a'.repeat(500))).toHaveLength(MAX_SEARCH_LENGTH);
  });

  it('returns null for nothing usable', () => {
    expect(sanitiseSearch(undefined)).toBeNull();
    expect(sanitiseSearch('')).toBeNull();
    expect(sanitiseSearch('   ')).toBeNull();
    expect(sanitiseSearch(',,,')).toBeNull();
  });
});

describe('searchFilter', () => {
  it('searches the three columns a sponsor would search', () => {
    expect(searchFilter('durand')).toBe(
      'first_name.ilike.*durand*,last_name.ilike.*durand*,email.ilike.*durand*',
    );
  });

  it('never searches the phone column', () => {
    // Deliberate: a partial phone match is noise, and the column is the one
    // most likely to contain the digits of an unrelated record.
    expect(searchFilter('06')).not.toContain('phone');
  });
});

describe('parseLeadsQuery', () => {
  it('defaults to the most recent contacts first', () => {
    const q = parseLeadsQuery({});
    expect(q.sort).toBe('date');
    expect(q.dir).toBe('desc');
    expect(q.column).toBe('first_seen_at');
    expect(q.page).toBe(1);
    expect(q.search).toBeNull();
  });

  it('reads a valid sort', () => {
    const q = parseLeadsQuery({ tri: 'nom.asc' });
    expect(q.sort).toBe('nom');
    expect(q.dir).toBe('asc');
    expect(q.column).toBe('last_name');
  });

  it('maps every sort key to a real column', () => {
    expect(parseLeadsQuery({ tri: 'email.asc' }).column).toBe('email');
    expect(parseLeadsQuery({ tri: 'campagne.asc' }).column).toBe('campaign_slug');
    expect(parseLeadsQuery({ tri: 'date.asc' }).column).toBe('first_seen_at');
  });

  it('falls back rather than erroring on a mistyped URL', () => {
    // A filter is not a route: an unrecognised value means "no filter", it does
    // not mean the page is broken.
    expect(parseLeadsQuery({ tri: 'salaire.desc' }).sort).toBe('date');
    expect(parseLeadsQuery({ tri: 'nom.sideways' }).dir).toBe('desc');
    expect(parseLeadsQuery({ tri: 'garbage' }).sort).toBe('date');
  });

  it('clamps the page to a whole number at or above one', () => {
    expect(parseLeadsQuery({ page: '3' }).page).toBe(3);
    expect(parseLeadsQuery({ page: '0' }).page).toBe(1);
    expect(parseLeadsQuery({ page: '-4' }).page).toBe(1);
    expect(parseLeadsQuery({ page: 'deux' }).page).toBe(1);
    expect(parseLeadsQuery({ page: '2.7' }).page).toBe(2);
  });

  it('computes an inclusive range Supabase can consume', () => {
    expect(parseLeadsQuery({ page: '1' }).from).toBe(0);
    expect(parseLeadsQuery({ page: '1' }).to).toBe(PAGE_SIZE - 1);
    expect(parseLeadsQuery({ page: '3' }).from).toBe(PAGE_SIZE * 2);
    expect(parseLeadsQuery({ page: '3' }).to).toBe(PAGE_SIZE * 3 - 1);
  });

  it('carries the sanitised search, not the raw one', () => {
    expect(parseLeadsQuery({ q: 'a,b' }).search).toBe('ab');
  });
});

describe('sortParam', () => {
  it('round-trips through parseLeadsQuery', () => {
    const q = parseLeadsQuery({ tri: sortParam('email', 'asc') });
    expect(q.sort).toBe('email');
    expect(q.dir).toBe('asc');
  });
});

describe('pageCount', () => {
  it('is one page when there is nothing, so the UI never shows « page 1 sur 0 »', () => {
    expect(pageCount(0)).toBe(1);
  });

  it('rounds up', () => {
    expect(pageCount(1)).toBe(1);
    expect(pageCount(PAGE_SIZE)).toBe(1);
    expect(pageCount(PAGE_SIZE + 1)).toBe(2);
  });
});
