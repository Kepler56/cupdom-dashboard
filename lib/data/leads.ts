import type { LeadRow } from '@/lib/analytics/types';
import type { SupabaseServerClient } from '@/lib/supabase/server';

/** Enough to prove the asset is real without turning the page into a table. */
export const LEADS_PREVIEW_LIMIT = 8;

/**
 * The client's own captured contacts, read straight off `public.leads`.
 *
 * No RPC, and that is the design rather than an omission: unlike `qr_scans`,
 * `leads` HAS a client policy (`leads read client`, migration 0009), because
 * these rows are the sponsor's own asset and spec §4.4 records the lawful basis
 * — the consent text each lead accepted names the sponsor by name. RLS filters
 * to `campaign_slug in (select public.client_slugs())`, so the `.eq()` below is
 * a convenience, not the security boundary.
 *
 * The column list is explicit and short. `select('*')` would ship whatever a
 * future migration adds to this table straight into a client-facing page.
 *
 * Returns null on failure rather than a DataResult: the caller has already
 * loaded the campaign through the same session, so a refusal or an outage has
 * been classified by a caller that surfaces it — and unlike the sparkline, this
 * one gets a visible « indisponible » state rather than silence, because an
 * empty contacts table and a failed contacts read look identical to a client and
 * the difference is the whole point of §4.6.
 */
export async function fetchRecentLeads(
  supabase: SupabaseServerClient,
  slug: string,
  limit: number = LEADS_PREVIEW_LIMIT,
): Promise<LeadRow[] | null> {
  const { data, error } = await supabase
    .from('leads')
    .select('id, first_name, last_name, email, phone, first_seen_at')
    .eq('campaign_slug', slug)
    .order('first_seen_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[portail] lecture des contacts impossible:', error.code, error.message);
    return null;
  }

  return (data ?? []) as LeadRow[];
}
