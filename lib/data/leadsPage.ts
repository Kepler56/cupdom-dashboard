import { pageCount, parseLeadsQuery, searchFilter, type LeadsQuery } from '@/lib/analytics/leadsQuery';
import type { CampaignRow, LeadListRow } from '@/lib/analytics/types';
import { createServerClient, type SupabaseServerClient } from '@/lib/supabase/server';
import { classifyPostgrestError, type DataResult } from './result';
import { resolveScope } from './scope';

/**
 * Explicit and minimal. `select('*')` on this table would ship whatever a future
 * migration adds — `last_activity_at`, anything else — straight into a
 * client-facing page and into the CSV a sponsor keeps forever.
 */
const COLUMNS = 'id, campaign_slug, first_name, last_name, email, phone, first_seen_at';

/**
 * The one query. The page and the CSV export both go through it, so what a
 * client sees and what they download cannot diverge — a filtered table beside
 * an unfiltered export is the kind of bug nobody notices until a sponsor emails
 * about a contact that "isn't in the portal".
 *
 * `limit` swaps the paginated range for a flat ceiling; that is the export's
 * only difference.
 */
export function selectLeads(
  supabase: SupabaseServerClient,
  args: { query: LeadsQuery; slug: string | null; limit?: number },
) {
  let q = supabase.from('leads').select(COLUMNS, { count: 'exact' });

  // RLS already restricts this to the caller's own campaigns; this narrows to
  // the ONE they filtered to.
  if (args.slug) q = q.eq('campaign_slug', args.slug);
  if (args.query.search) q = q.or(searchFilter(args.query.search));

  q = q
    // nullsFirst: false in BOTH directions. `last_name` and `email` are NULL on
    // an anonymised lead, and Postgres puts NULLs first on a descending sort —
    // so a sponsor sorting by name would land on a screen of « Contact
    // anonymisé » rows carrying no information.
    .order(args.query.column, { ascending: args.query.dir === 'asc', nullsFirst: false })
    // Deterministic tiebreak. Without it two rows sharing a timestamp can swap
    // between requests, so one appears on two pages and another on none.
    .order('id', { ascending: true });

  return args.limit === undefined ? q.range(args.query.from, args.query.to) : q.limit(args.limit);
}

export interface LeadsPageData {
  campaigns: CampaignRow[];
  slug: string | null;
  query: LeadsQuery;
  rows: LeadListRow[];
  /** Rows matching the filter, not rows on this page. */
  total: number;
  pages: number;
}

export async function fetchLeadsPage(args: {
  rawSlug: string | undefined;
  params: { tri?: string; q?: string; page?: string };
}): Promise<DataResult<LeadsPageData>> {
  const supabase = await createServerClient();

  const scope = await resolveScope(supabase, args.rawSlug);
  if (!scope.ok) return scope;
  const { campaigns, slug } = scope.data;

  const query = parseLeadsQuery(args.params);
  const { data, count, error } = await selectLeads(supabase, { query, slug });

  if (error) return { ok: false, failure: classifyPostgrestError(error) };

  const total = count ?? 0;
  return {
    ok: true,
    data: { campaigns, slug, query, rows: (data ?? []) as LeadListRow[], total, pages: pageCount(total) },
  };
}
