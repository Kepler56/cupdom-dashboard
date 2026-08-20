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

/**
 * `client_scans_geo(p_from, p_to, p_slug, p_level)` — one row per distinct value
 * of the chosen level, already ordered by scans desc.
 *
 * Missing values arrive as the string 'Inconnu', not NULL: the RPC coalesces
 * them so the portal never renders a nameless bar, and so that "we do not know"
 * is visible rather than quietly dropped.
 */
export interface GeoRow {
  label: string;
  scans: number;
  uniques: number;
}

/**
 * `client_scans_hourly(p_from, p_to, p_slug)`.
 *
 * `dow` is ISO: 1 = lundi … 7 = dimanche. Both `dow` and `hour` are computed
 * `at time zone 'Europe/Paris'` inside the RPC — a scan at 00:30 Paris in summer
 * is 22:30 UTC the previous day, and a UTC heatmap would light up the wrong
 * night. Cells with no scans are ABSENT from the result.
 */
export interface HourlyRow {
  dow: number;
  hour: number;
  scans: number;
}

/**
 * `client_scans_tech(p_from, p_to, p_slug)` — four dimensions in one result set:
 * 'device_type', 'os', 'browser', 'language'.
 *
 * Note there is no `uniques` column, unlike GeoRow: technology shares are
 * shares of SCANS, not of people. The UI must not imply otherwise.
 */
export interface TechRow {
  dimension: string;
  label: string;
  scans: number;
}

/**
 * `client_campaigns_daily(p_from, p_to)` — the daily scan curve for every
 * campaign the caller owns, in one call.
 *
 * `day` is a Paris CALENDAR DATE ('2026-08-19'), like DailyRow's. Days with no
 * scans are ABSENT, and so is any campaign with no scans in the window at all —
 * so the consumer must be told which slugs to expect rather than inferring them
 * from the rows. See lib/analytics/campaignSeries.ts.
 *
 * No `uniques` and no `leads`: the only consumer is a sparkline.
 */
export interface CampaignDailyRow {
  slug: string;
  day: string;
  scans: number;
}
