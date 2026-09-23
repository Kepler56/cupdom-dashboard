import type { SupabaseServerClient } from '@/lib/supabase/server';

export interface ClientProfile {
  contactId: string;
  /** Absolute URL of the sponsor logo (Supabase Storage), or null. */
  sponsorLogoUrl: string | null;
}

/**
 * The caller's own contact profile — the logo lives on `contacts`, which is
 * member-read-only, so a portal client reaches it only through this SECURITY
 * DEFINER RPC (migration 0020). Returns null on any failure or for a non-client
 * (a member's current_client_contact() is null, so the RPC returns no row).
 */
export async function loadClientProfile(supabase: SupabaseServerClient): Promise<ClientProfile | null> {
  const { data, error } = await supabase.rpc('client_profile');
  if (error || !data) return null;
  const row = (data as { contact_id: string; display_name: string | null; sponsor_logo_url: string | null }[])[0];
  if (!row) return null;
  return { contactId: row.contact_id, sponsorLogoUrl: row.sponsor_logo_url };
}
