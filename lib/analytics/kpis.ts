import { formatEuros, formatNumber, formatPoints, formatRate, formatSignedPercent } from './format';
import type { SeriesPoint } from './series';
import type { CampaignRow, OverviewRow } from './types';

export type TrendKind = 'up' | 'down' | 'flat' | 'none';

export interface Trend {
  kind: TrendKind;
  /** Relative change (0.38 = +38 %), or an absolute delta when unit is 'points' (0.04 = +4 pts). Null when kind is 'none'. */
  value: number | null;
  unit: 'percent' | 'points';
}

/**
 * Below this, a percentage change is noise wearing the costume of information:
 * 1 → 3 scans is "+200 %". Spec §4.6-3.
 *
 * The floor applies to the DENOMINATOR only. 200 → 3 is a genuine collapse and
 * the client needs to see it.
 */
export const MIN_TREND_VOLUME = 10;

/** Movements smaller than this read as "stable" to a human, so they are labelled that way. */
const FLAT_BAND = 0.005;

const NO_TREND: Trend = { kind: 'none', value: null, unit: 'percent' };

function classify(value: number, unit: Trend['unit']): Trend {
  const kind: TrendKind = value > FLAT_BAND ? 'up' : value < -FLAT_BAND ? 'down' : 'flat';
  return { kind, value, unit };
}

export function computeTrend(current: number, previous: number, hasPrevious: boolean): Trend {
  if (!hasPrevious || previous < MIN_TREND_VOLUME) return NO_TREND;
  return classify((current - previous) / previous, 'percent');
}

/**
 * A trend on a RATE, in points.
 *
 * Both denominators must clear the floor: a rate computed over three people is
 * not a rate, and comparing two of them is theatre.
 */
export function computeRateTrend(
  current: { part: number; whole: number },
  previous: { part: number; whole: number },
  hasPrevious: boolean,
): Trend {
  if (!hasPrevious || previous.whole < MIN_TREND_VOLUME || current.whole < MIN_TREND_VOLUME) {
    return { ...NO_TREND, unit: 'points' };
  }
  return classify(current.part / current.whole - previous.part / previous.whole, 'points');
}

export function trendLabel(trend: Trend): string | null {
  if (trend.kind === 'none' || trend.value === null) return null;
  return trend.unit === 'points' ? formatPoints(trend.value) : formatSignedPercent(trend.value);
}

/**
 * Spec §4.7. Returns null meaning "do not render the tile AT ALL" — not zero,
 * not an em dash.
 *
 * Two rules, both about not misleading:
 * - Every campaign in the selection must carry an amount. An average over
 *   partial data would understate the cost, and this is the one figure that
 *   speaks finance, so it is the one most likely to be quoted back at us.
 * - Lifetime, not period. The investment is a lifetime figure; dividing it by
 *   seven days of contacts would invent a cost per contact several times too
 *   high. The tile is labelled « depuis le début » for the same reason the
 *   funnel is.
 */
export function costPerLead(campaigns: CampaignRow[]): number | null {
  if (campaigns.length === 0) return null;
  if (campaigns.some((c) => c.invested_amount_eur === null || c.invested_amount_eur === undefined)) return null;

  const leads = campaigns.reduce((sum, c) => sum + c.leads, 0);
  if (leads <= 0) return null;

  const invested = campaigns.reduce((sum, c) => sum + Number(c.invested_amount_eur), 0);
  return invested / leads;
}

export type KpiId = 'touchees' | 'scans' | 'contacts' | 'captation' | 'cout';

export interface Kpi {
  id: KpiId;
  label: string;
  /** Already formatted fr-FR. Components never format. */
  value: string;
  /** The definition, shown on hover and to screen readers. Spec §4.6-2. */
  hint: string;
  trend: Trend;
  trendLabel: string | null;
  /** Empty for rates and for the cost tile. */
  sparkline: number[];
}

/**
 * Why every trend is missing, or null when at least one is shown.
 *
 * Spec §4.6-3 says low data must SAY SO. Suppressing the badges is the right
 * call — a percentage against an empty or tiny previous window is noise — but
 * suppressing them silently reads as a broken dashboard, which is the failure
 * this rule exists to prevent. The two causes need different words: "Tout" has
 * no earlier window by definition, whereas a fixed period simply has nothing
 * recorded before it yet.
 */
export function trendNote(kpis: Kpi[], hasPrevious: boolean): string | null {
  if (kpis.length === 0) return null;
  if (kpis.some((k) => k.trend.kind !== 'none')) return null;
  return hasPrevious
    ? 'Pas encore assez de données sur la période précédente pour calculer une évolution.'
    : 'La période « Tout » n’a pas de période précédente à laquelle se comparer.';
}

export interface KpiInput {
  current: OverviewRow;
  previous: OverviewRow;
  hasPrevious: boolean;
  series: SeriesPoint[];
  /** The campaigns actually in scope — narrowed by the `?c=` filter. */
  campaigns: CampaignRow[];
}

function tile(id: KpiId, label: string, value: string, hint: string, trend: Trend, sparkline: number[]): Kpi {
  return { id, label, value, hint, trend, trendLabel: trendLabel(trend), sparkline };
}

export function buildKpis({ current, previous, hasPrevious, series, campaigns }: KpiInput): Kpi[] {
  const kpis: Kpi[] = [
    tile(
      'touchees',
      'Personnes touchées',
      formatNumber(current.uniques),
      'Comptage unique par jour. Une personne qui scanne deux jours de suite compte deux fois : nous ne suivons personne d’un jour à l’autre, par choix et pour sa vie privée.',
      computeTrend(current.uniques, previous.uniques, hasPrevious),
      series.map((p) => p.uniques),
    ),
    tile(
      'scans',
      'Scans totaux',
      formatNumber(current.scans),
      'Toutes les interactions sur la période. Les robots sont exclus de ce chiffre comme de tous les autres.',
      computeTrend(current.scans, previous.scans, hasPrevious),
      series.map((p) => p.scans),
    ),
    tile(
      'contacts',
      'Contacts captés',
      formatNumber(current.leads),
      'Les personnes qui vous ont laissé leurs coordonnées, avec leur consentement.',
      computeTrend(current.leads, previous.leads, hasPrevious),
      series.map((p) => p.leads),
    ),
    tile(
      'captation',
      'Taux de captation',
      // The em dash rather than '0 %' lives in formatRate — same rule, same
      // wording, as the campaigns table's Taux column.
      formatRate(current.leads, current.uniques),
      'Contacts captés rapportés aux personnes touchées.',
      computeRateTrend(
        { part: current.leads, whole: current.uniques },
        { part: previous.leads, whole: previous.uniques },
        hasPrevious,
      ),
      [],
    ),
  ];

  const cost = costPerLead(campaigns);
  if (cost !== null) {
    kpis.push(
      tile(
        'cout',
        'Coût par contact',
        formatEuros(cost),
        'Depuis le début : le montant investi rapporté aux contacts captés. Affiché seulement quand le montant est renseigné pour toutes les campagnes affichées.',
        { ...NO_TREND },
        [],
      ),
    );
  }

  return kpis;
}
