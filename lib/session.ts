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
