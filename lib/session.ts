import { cache } from 'react';
import { createServerClient } from '@/lib/supabase/server';

export interface ClientAccount {
  id: string;
  contactId: string;
  email: string;
  displayName: string | null;
  mustChangePassword: boolean;
}

/**
 * The caller's own client_accounts row, or null when they are not an active
 * portal client (a CRM member, or a deactivated account).
 *
 * RLS does the work: the "client_accounts self read" policy restricts this to
 * `auth_user_id = auth.uid()`, so a client physically cannot read anyone
 * else's row — this query returns at most one row for structural reasons, not
 * because we filtered it.
 *
 * MEMOISED PER REQUEST with React's cache(). Every screen calls this twice:
 * once in (portal)/layout.tsx to run the routing gate, and again in the page
 * itself for the company name in the TopBar. Those were two separate
 * round-trips to Postgres for one identical row.
 *
 * That is not free here: Netlify runs this function in Ohio (CMH) and Supabase
 * lives in eu-west-1, so each duplicate cost a measured ~85 ms of Atlantic
 * crossing on every single page view. cache() collapses them to one for the
 * duration of a request, and only for the duration of a request — it is
 * per-render memoisation, NOT a shared cache, so one client can never observe
 * another's account row.
 *
 * Do not "optimise" this into a module-level variable. That WOULD be shared
 * across requests, and in a serverless container it would leak one client's
 * account to the next request served by the same instance.
 */
export const getClientAccount = cache(async (): Promise<ClientAccount | null> => {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('client_accounts')
    .select('id, contact_id, email, display_name, must_change_password, active')
    .maybeSingle();

  if (error || !data || !data.active) return null;

  return {
    id: data.id,
    contactId: data.contact_id,
    email: data.email,
    displayName: data.display_name,
    mustChangePassword: data.must_change_password,
  };
});

/**
 * Whether the caller is one of the 3 Cupdom members (#4).
 *
 * A member has NO client_accounts row, so getClientAccount() returns null and,
 * without this, they are bounced out of the portal. This asks Postgres — via the
 * SECURITY DEFINER is_cupdom_member() RPC (added in migration 0018) — which reads
 * the member allowlist off the caller's JWT. It is the gate that lets an admin
 * into the portal and unlocks the client picker.
 *
 * MEMOISED PER REQUEST, like getClientAccount, so the layout gate and the pages
 * do not each pay the ~85ms round-trip. A network error resolves to false — the
 * safe default is "not a member".
 */
export const isCupdomMember = cache(async (): Promise<boolean> => {
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc('is_cupdom_member');
  return !error && data === true;
});
