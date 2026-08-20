/**
 * PURE. The /contacts URL, turned into a query.
 *
 * Sort, search and page all live in the URL because each changes what is
 * FETCHED — the browser never holds rows it is not showing, so a client with
 * twenty thousand contacts pays for fifty.
 */

export type SortKey = 'nom' | 'email' | 'campagne' | 'date';
export type SortDir = 'asc' | 'desc';

/** Fifty rows is about a screen and a half, and one round-trip. */
export const PAGE_SIZE = 50;

/**
 * The export's ceiling. Above this the CSV carries the first
 * EXPORT_MAX_ROWS in the ACTIVE SORT, and the page says so before the client
 * clicks — a silently truncated export is a client building a campaign on data
 * they think is complete.
 */
export const EXPORT_MAX_ROWS = 5000;

export const MAX_SEARCH_LENGTH = 64;

const COLUMN: Record<SortKey, string> = {
  nom: 'last_name',
  email: 'email',
  campagne: 'campaign_slug',
  date: 'first_seen_at',
};

const SORT_KEYS = Object.keys(COLUMN) as SortKey[];

export const DEFAULT_SORT: SortKey = 'date';
export const DEFAULT_DIR: SortDir = 'desc';

/**
 * Everything a search term is allowed to contain.
 *
 * An ALLOWLIST, never a blocklist, and this is the security boundary of the
 * feature. `searchFilter` below builds a PostgREST `.or()` argument by string
 * concatenation, and PostgREST parses that string as filter SYNTAX — so a comma,
 * a parenthesis or a star that survives this function is not a broken query, it
 * is the caller choosing which filters run. RLS still bounds the rows they could
 * ever reach, but they could probe columns this page never exposes.
 *
 * The set is what a person types into a contact search: letters in any language,
 * digits, space, and the four punctuation marks that appear inside real names
 * and addresses.
 *
 * `.` is deliberately kept, and that decision is measured, not assumed: a
 * PostgREST `.or()` filter consumes everything after `col.op.` as the VALUE, so
 * an interior dot lands there as data, not as syntax — only a comma closes the
 * current filter and lets a new `col.op.value` triple begin, which is why comma
 * (and paren, and star) are the ones stripped above. Confirmed live: searching
 * the client's own 823 leads for the literal string `phone.not.is.null` — every
 * one of those 823 rows HAS a phone number — returned 0 rows. Had the dots
 * re-opened filter parsing into `phone.not.is.null` as its own clause, it would
 * have returned all 823. It did not, so the dot is inert where it matters.
 */
const ALLOWED = /[^\p{L}\p{N} @.\-_']/gu;

export function sanitiseSearch(raw: string | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(ALLOWED, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_SEARCH_LENGTH);
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * The PostgREST `.or()` argument.
 *
 * Three columns, not four: `phone` is excluded deliberately. A partial digit
 * match is noise, and it is the column most likely to make an unrelated
 * person's record surface under someone else's search.
 *
 * `*` is PostgREST's `ilike` wildcard. `sanitiseSearch` has already removed any
 * `*` the caller supplied, so the only wildcards here are ours.
 */
export function searchFilter(search: string): string {
  return ['first_name', 'last_name', 'email'].map((c) => `${c}.ilike.*${search}*`).join(',');
}

export interface LeadsQuery {
  sort: SortKey;
  dir: SortDir;
  /** 1-based, as it appears in the URL and to the reader. */
  page: number;
  /** Sanitised, or null when there is no usable search. */
  search: string | null;
  /** The database column `sort` maps to. */
  column: string;
  /** Inclusive range bounds for `.range()`. */
  from: number;
  to: number;
}

/** `?tri=nom.asc` — one parameter carrying both halves, so they cannot disagree. */
export function sortParam(sort: SortKey, dir: SortDir): string {
  return `${sort}.${dir}`;
}

export function parseLeadsQuery(params: { tri?: string; q?: string; page?: string }): LeadsQuery {
  const [rawSort, rawDir] = (params.tri ?? '').split('.');

  const sort = (SORT_KEYS as string[]).includes(rawSort) ? (rawSort as SortKey) : DEFAULT_SORT;
  const dir: SortDir = rawDir === 'asc' || rawDir === 'desc' ? rawDir : DEFAULT_DIR;

  // Math.floor, not parseInt alone: '2.7' is a page the URL can carry and 2 is
  // the only sensible reading of it. NaN and anything below 1 fall to 1 — a
  // mistyped page is not an error state.
  const parsed = Math.floor(Number(params.page));
  const page = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;

  const from = (page - 1) * PAGE_SIZE;

  return {
    sort,
    dir,
    page,
    search: sanitiseSearch(params.q),
    column: COLUMN[sort],
    from,
    to: from + PAGE_SIZE - 1,
  };
}

/** Never zero: « page 1 sur 0 » is not a thing a reader can parse. */
export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}
