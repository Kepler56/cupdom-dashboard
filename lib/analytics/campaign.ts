import { formatDayLong } from './format';
import { parisDay } from './series';
import type { CampaignRow } from './types';

export interface DestinationView {
  /** The full URL, unchanged — this is what the QR ultimately leads to. */
  href: string;
  /** What the header prints. A destination with UTM parameters is unreadable in full. */
  host: string;
}

/**
 * The campaign's destination, safe to put in an `href`.
 *
 * `destination_url` is free text typed by a Cupdom member in the CRM. It reaches
 * a link a CLIENT clicks, so the scheme is allowlisted rather than trusted:
 * `javascript:` and `data:` in an href are the classic way a stored value
 * becomes executable, and « our own staff typed it » is not a security boundary.
 *
 * Returns null on anything unparseable instead of throwing, because a bad URL in
 * one campaign must not take down that campaign's whole page.
 */
export function destinationView(raw: string | null | undefined): DestinationView | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return { href: raw, host: url.host };
  } catch {
    return null;
  }
}

export interface CampaignHeaderView {
  name: string;
  active: boolean;
  /** Null when unset OR blank — a header field reading « » is worse than an absent one. */
  product: string | null;
  venue: string | null;
  destination: DestinationView | null;
  /** « 17 mai 2026 », or null when created_at is unusable. */
  createdLabel: string | null;
}

const trimmed = (value: string | null | undefined): string | null => {
  const text = (value ?? '').trim();
  return text.length > 0 ? text : null;
};

/**
 * PURE. Everything the detail header prints, decided once.
 *
 * The launch date is converted to the PARIS calendar day before formatting, for
 * the same reason every bucket in this product is: a campaign created at 23:30
 * UTC was created after midnight in Paris, and « lancée le 17 mai » beside a
 * curve that starts on the 18th is the kind of small inconsistency a client
 * notices and then stops trusting the rest of the page over.
 */
export function buildCampaignHeader(campaign: CampaignRow): CampaignHeaderView {
  const created = new Date(campaign.created_at);
  const createdLabel = Number.isNaN(created.getTime()) ? null : formatDayLong(parisDay(created));

  return {
    name: campaign.name,
    active: campaign.active,
    product: trimmed(campaign.product),
    venue: trimmed(campaign.venue),
    destination: destinationView(campaign.destination_url),
    createdLabel,
  };
}
