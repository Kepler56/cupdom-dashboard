import { formatDayLong } from './format';
import { parisDay } from './series';
import type { LeadRow } from './types';

export interface LeadView {
  id: string;
  /** Always a real string: a name, « Sans nom », or « Contact anonymisé ». */
  name: string;
  email: string | null;
  phone: string | null;
  /** « 14 août 2026 », or null when first_seen_at is unusable. */
  dateLabel: string | null;
  /** True when every PII field is gone — retention or an erasure request. */
  anonymised: boolean;
}

const trimmed = (value: string | null | undefined): string | null => {
  const text = (value ?? '').trim();
  return text.length > 0 ? text : null;
};

/**
 * PURE. One captured contact, ready to render.
 *
 * The case worth reading carefully is the ANONYMISED lead. Migration 0008's
 * `run_lead_anonymisation()` nulls the four PII columns after the retention
 * window and `erase_lead()` does the same on request, both keeping the row — so
 * the sponsor's « Contacts captés » count stays truthful. That means a row with
 * nothing in it is not a bug and must not render as four empty cells: it is a
 * real contact whose details we are no longer allowed to hold, and the table
 * says so.
 *
 * A lead with no NAME but a live email is a different thing entirely — the form
 * requires an email and not a name — so the two are distinguished rather than
 * collapsed into one apologetic label.
 *
 * See the plan's Known gaps: this is an inference from four empty columns, not a
 * flag. An `anonymised_at` column would make it a fact.
 */
export function toLeadViews(rows: LeadRow[]): LeadView[] {
  return rows.map((row) => {
    const first = trimmed(row.first_name);
    const last = trimmed(row.last_name);
    const email = trimmed(row.email);
    const phone = trimmed(row.phone);
    const anonymised = !first && !last && !email && !phone;

    const captured = new Date(row.first_seen_at);

    return {
      id: row.id,
      name: [first, last].filter(Boolean).join(' ') || (anonymised ? 'Contact anonymisé' : 'Sans nom'),
      email,
      phone,
      dateLabel: Number.isNaN(captured.getTime()) ? null : formatDayLong(parisDay(captured)),
      anonymised,
    };
  });
}
