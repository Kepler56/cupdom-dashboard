/**
 * The stage-1 RPC row shapes, exactly as PostgREST serialises them.
 *
 * snake_case on purpose: these are the DATABASE's names, and keeping them
 * verbatim means one obvious place to look when a column is renamed. Everything
 * downstream converts to view models with French labels; nothing else in the
 * app should carry a snake_case field.
 *
 * Numeric note: Postgres `bigint` and `numeric` both arrive as JSON numbers
 * (PostgREST serialises via `to_json`), so these are `number`, not `string`.
 */

/** `client_overview(p_from, p_to, p_prev_from, p_prev_to, p_slug)` — exactly two rows. */
export interface OverviewRow {
  bucket: 'current' | 'previous';
  scans: number;
  uniques: number;
  leads: number;
}

/**
 * `client_scans_daily(p_from, p_to, p_slug)`.
 *
 * `day` is a Paris CALENDAR DATE ('2026-08-19'), already bucketed
 * `at time zone 'Europe/Paris'` inside the RPC. Days with no activity are
 * ABSENT from the result — see lib/analytics/series.ts.
 */
export interface DailyRow {
  day: string;
  scans: number;
  uniques: number;
  leads: number;
}

/**
 * `client_funnel(p_slug)` — a single row, campaign LIFETIME.
 *
 * No date parameters by design (spec §4.9): `distribues` is a campaign total,
 * so a period-filtered funnel whose first stage still showed the all-time count
 * would be silently wrong.
 */
export interface FunnelRow {
  distribues: number;
  scannes: number;
  formulaire_vu: number;
  formulaire_soumis: number;
  offre_atteinte: number;
}

/** `client_campaigns()` — the client's campaigns with lifetime rollups. */
export interface CampaignRow {
  slug: string;
  name: string;
  sponsor_name: string;
  product: string | null;
  destination_url: string;
  active: boolean;
  venue: string | null;
  distributed_count: number | null;
  /** Owner-confirmed investment. Null means "not entered" — see spec §4.7. */
  invested_amount_eur: number | null;
  created_at: string;
  scans: number;
  uniques: number;
  leads: number;
}
