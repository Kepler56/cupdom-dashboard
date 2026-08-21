import { parisDay } from '@/lib/analytics/series';
import type { LeadListRow } from '@/lib/analytics/types';
import type { CsvColumn } from './toCsv';

/**
 * `JJ/MM/AAAA` — what a French spreadsheet parses as a date. `formatDayLong`'s
 * « 14 août 2026 » is right for a screen and useless in a column someone will
 * sort or filter on.
 */
function frDate(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  const [y, m, d] = parisDay(at).split('-');
  return `${d}/${m}/${y}`;
}

/**
 * The exported columns, exactly as spec §4.3-D names them.
 *
 * Two differences from the on-screen table, both deliberate:
 *
 * - **Nom and Prénom are separate.** The table merges them because
 *   `toLeadViews` has to render « Sans nom » and « Contact anonymisé »
 *   gracefully; a CSV is an import format, and every CRM on earth wants the two
 *   fields apart.
 * - **An anonymised lead exports as empty cells**, not as « Contact anonymisé ».
 *   That string is an on-screen explanation. In a spreadsheet it would sit in a
 *   name column looking like a person, and could be mail-merged into a greeting.
 *
 * The internal `id` is not exported: it identifies nothing outside our database
 * and gives a sponsor a key we would then have to keep stable forever.
 */
export const LEAD_CSV_COLUMNS: CsvColumn<LeadListRow>[] = [
  { header: 'Nom', value: (r) => r.last_name },
  { header: 'Prénom', value: (r) => r.first_name },
  { header: 'E-mail', value: (r) => r.email },
  { header: 'Téléphone', value: (r) => r.phone },
  { header: 'Campagne', value: (r) => r.campaign_slug },
  { header: 'Capté le', value: (r) => frDate(r.first_seen_at) },
];

/** Date-stamped so a second export does not silently replace the first in Downloads. */
export function leadsCsvFilename(now: Date, slug: string | null): string {
  const day = parisDay(now);
  const safe = (slug ?? 'cupdom').replace(/[^a-zA-Z0-9-]/g, '');
  return `contacts-${safe || 'cupdom'}-${day}.csv`;
}
