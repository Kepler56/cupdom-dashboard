import { parseCampaign } from '@/lib/analytics/selection';
import type { CampaignRow } from '@/lib/analytics/types';
import type { SupabaseServerClient } from '@/lib/supabase/server';
import { classifyPostgrestError, type DataResult } from './result';

export interface Scope {
  campaigns: CampaignRow[];
  /** The campaign actually in scope after validation. Null means "all of them". */
  slug: string | null;
}

/**
 * The campaign list plus the validated `?c=` slug.
 *
 * Deliberately serialised ahead of every other RPC on a page: the list is what
 * makes the slug safe to pass on. Passing an unvalidated slug would raise
 * insufficient_privilege and paint « Accès refusé » over a mistyped URL.
 *
 * Extracted from overview.ts so both screens share one implementation — two
 * copies of a security-adjacent decision is how they drift apart.
 */
export async function resolveScope(
  supabase: SupabaseServerClient,
  rawSlug: string | undefined,
): Promise<DataResult<Scope>> {
  const response = await supabase.rpc('client_campaigns');
  if (response.error) {
    return { ok: false, failure: classifyPostgrestError(response.error) };
  }

  const campaigns = (response.data ?? []) as CampaignRow[];
  return { ok: true, data: { campaigns, slug: parseCampaign(rawSlug, campaigns.map((c) => c.slug)) } };
}
