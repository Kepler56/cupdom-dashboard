import { parseLeadsQuery, EXPORT_MAX_ROWS } from '@/lib/analytics/leadsQuery';
import type { LeadListRow } from '@/lib/analytics/types';
import { LEAD_CSV_COLUMNS, leadsCsvFilename } from '@/lib/export/leadsCsv';
import { toCsv } from '@/lib/export/toCsv';
import { selectLeads } from '@/lib/data/leadsPage';
import { resolveScope } from '@/lib/data/scope';
import { createServerClient } from '@/lib/supabase/server';

/**
 * The CSV the sponsor takes away.
 *
 * A Route Handler rather than a client-side download: the browser would
 * otherwise have to hold every exported row in order to serialise it, and the
 * page deliberately never fetches more than fifty.
 *
 * NOTE ON AUTH: Route Handlers do not run the portal layout, so the
 * `getClientAccount` gate that guards the pages does not apply here. That is
 * fine, and it is worth being explicit about why: the layout gate is for
 * ROUTING, and the real boundary is RLS plus the RPC guards. `resolveScope`
 * calls `client_campaigns()`, which raises `insufficient_privilege` for anyone
 * who is not an active portal client, and the `leads` read is filtered by the
 * `leads read client` policy against the caller's own JWT. A CRM member hitting
 * this URL gets 403 and an empty body.
 *
 * NOTHING derived from a row may be logged here — not a count with a name, not
 * an error containing a value. Code and message only.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const supabase = await createServerClient();

  const scope = await resolveScope(supabase, url.searchParams.get('c') ?? undefined);
  if (!scope.ok) {
    const refused = scope.failure.kind === 'refused';
    return new Response(refused ? 'Accès refusé.' : 'Export impossible pour le moment.', {
      status: refused ? 403 : 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const query = parseLeadsQuery({
    tri: url.searchParams.get('tri') ?? undefined,
    q: url.searchParams.get('q') ?? undefined,
  });

  // Same builder as the table, so what the client downloads is what they were
  // looking at — with the range swapped for the export ceiling.
  const { data, error } = await selectLeads(supabase, {
    query,
    slug: scope.data.slug,
    limit: EXPORT_MAX_ROWS,
  });

  if (error) {
    console.warn('[portail] export CSV impossible:', error.code, error.message);
    return new Response('Export impossible pour le moment.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const csv = toCsv((data ?? []) as LeadListRow[], LEAD_CSV_COLUMNS);
  const filename = leadsCsvFilename(new Date(), scope.data.slug);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      // This is personal data. It must not sit in a shared cache, and it must
      // not be served from one to a different client.
      'Cache-Control': 'no-store, private',
    },
  });
}
