import { createServerClient } from '@/lib/supabase/server';

export interface AdminClientOption {
  contactId: string;
  /** company, falling back to the contact's name, then a placeholder. */
  label: string;
  campaigns: number;
}

type Row = {
  contact_id: string;
  company: string | null;
  contact_name: string | null;
  campaigns: number | string;
};

/**
 * The clients a Cupdom member may inspect through the portal picker (#4).
 *
 * Calls admin_portal_clients() (migration 0018), which is SECURITY DEFINER and
 * RAISES for anyone who is not a member — so a real client calling it directly
 * gets nothing, and a network/permission error here resolves to an empty list
 * (the picker then simply does not render). It returns one row per contact that
 * owns at least one campaign, ordered by company.
 */
export async function fetchAdminClients(): Promise<AdminClientOption[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc('admin_portal_clients');
  if (error || !data) return [];
  return (data as Row[]).map((r) => ({
    contactId: r.contact_id,
    label: r.company?.trim() || r.contact_name?.trim() || 'Client sans nom',
    campaigns: Number(r.campaigns ?? 0),
  }));
}
