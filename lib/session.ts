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
 */
export async function getClientAccount(): Promise<ClientAccount | null> {
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
}
