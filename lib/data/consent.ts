import type { SupabaseServerClient } from '@/lib/supabase/server';

export interface ConsentRow {
  consent_text: string;
  consent_version: string | null;
  leads: number;
}

/**
 * The consent wordings recorded against this client's own leads.
 *
 * Spec §4.4: the page that shows the personal data is the page that states the
 * lawful basis for showing it. This returns the RECORDED evidence from
 * `lead_consents` rather than reconstructing the sentence from a constant —
 * because the wording is marked provisional in the CRM and will change, while
 * leads keep the version they actually accepted.
 *
 * Returns null on ANY failure, and the panel renders that as its own visible
 * state. Note the difference from `loadSparklines`, which degrades silently: a
 * missing curve is an absent ornament, whereas a missing legal statement that
 * renders as blank space reads as « no consent was recorded », which is a far
 * more expensive thing to imply. Same mechanism, opposite visibility, and that
 * is the deliberate part.
 */
export async function loadConsents(supabase: SupabaseServerClient): Promise<ConsentRow[] | null> {
  const { data, error } = await supabase.rpc('client_lead_consents');

  if (error) {
    // Code and message only. This function touches a table of consent records;
    // nothing derived from a row may reach a log.
    console.warn('[portail] client_lead_consents indisponible:', error.code, error.message);
    return null;
  }

  return (data ?? []) as ConsentRow[];
}
