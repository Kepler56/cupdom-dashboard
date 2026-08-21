/**
 * « Temps forts » — spec §4.5.
 *
 * PURE, and deliberately thin. Every number these sentences quote is already
 * computed, already formatted and already gated by a minimum-volume floor
 * somewhere in this directory: `buildHeatmap` owns the peak, `buildRanking`
 * owns shares, `buildFunnel` owns the worst drop-off. This module adapts those
 * view models into one sentence shape and ranks them. It does not re-derive a
 * threshold, and it must never grow a second definition of a number the rest of
 * the portal already states — a « temps fort » that disagreed with the chart
 * directly above it is the most expensive bug this feature can have.
 *
 * Spec §4.5: « Each insight is a pure function (aggregates) -> Insight | null
 * with an explicit minimum-volume threshold. No insight is ever computed on a
 * handful of scans. »
 */

import { formatNumber, formatSignedPercent } from './format';
import type { OverviewRow } from './types';

export type InsightId = 'tendance' | 'captation' | 'pic' | 'decrochage' | 'villes' | 'appareil';

/**
 * A sentence, split at its emphasis.
 *
 * Three fields rather than one string with markup in it: the strip bolds a
 * fragment, and the alternatives are `dangerouslySetInnerHTML` (an injection
 * surface for a value that includes a client's own city and campaign names) or
 * parsing markers back out of a string at render time. Either `lead` or `tail`
 * may be empty; `emphasis` never is.
 */
export interface Insight {
  id: InsightId;
  /** 0..1. Drives the ranking. Each generator documents what its own scale means. */
  strength: number;
  lead: string;
  emphasis: string;
  tail: string;
}

/** Spec §4.5: « Insights are ranked and the top three are shown. » */
export const MAX_INSIGHTS = 3;

/**
 * The tiebreak, most commercially useful first.
 *
 * Only reached when two insights score identically. Without it the winner would
 * be decided by the order the page happens to pass the candidates in, which is
 * invisible at the call site and would change the moment someone reorders an
 * argument list.
 */
const FAMILY_ORDER: readonly InsightId[] = Object.freeze([
  'tendance',
  'captation',
  'pic',
  'decrochage',
  'villes',
  'appareil',
]);

export function selectInsights(candidates: (Insight | null)[]): Insight[] {
  return candidates
    .filter((candidate): candidate is Insight => candidate !== null)
    .sort(
      (a, b) =>
        b.strength - a.strength || FAMILY_ORDER.indexOf(a.id) - FAMILY_ORDER.indexOf(b.id),
    )
    .slice(0, MAX_INSIGHTS);
}

/** Strengths are ratios that can legitimately exceed 1 (a doubling is +100 %). */
export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/**
 * Below this many people reached, a captation rate is a coincidence.
 *
 * Set on UNIQUES, not scans: the rate's denominator is people, and gating on
 * scans would let one enthusiast scanning fifty times authorise a claim about
 * a handful of humans.
 */
export const MIN_CAPTATION_UNIQUES = 50;

/** Below this many scans in the PREVIOUS window, a trend has no baseline. */
export const MIN_TREND_SCANS = 50;

/** A move smaller than this is period noise, not a temps fort. */
export const MIN_TREND_DELTA = 0.1;

/**
 * How far « 1 personne sur N » may sit from the real rate before we decline to
 * say it.
 *
 * The sentence claims a rate of 1/N. The real rate rarely IS 1/N, and the
 * « Taux de captation » tile on the same screen shows the true figure to the
 * point — so a claim that drifts is a claim the client can check and catch.
 * Two points is the width at which both numbers still round to the same story.
 * Beyond it the insight says nothing at all, which §4.6-3 prefers to a number
 * that flatters.
 */
export const MAX_CAPTATION_ROUNDING_DRIFT = 0.02;

/** A one-in-four capture is an excellent rate for this product; at or above it the insight is as notable as it gets. */
export const CAPTATION_RATE_FOR_FULL_STRENGTH = 0.25;

/** A half-again swing between periods is dramatic; beyond it the score saturates rather than crowding out every other insight. */
export const TREND_DELTA_FOR_FULL_STRENGTH = 0.5;

/**
 * « 1 personne sur 4 vous laisse ses coordonnées. »
 *
 * The spec's own phrasing, and it beats « 25 % » for the same reason the KPI
 * tile keeps the percentage: a proportion of PEOPLE is what a sponsor repeats
 * to their own management. `strength` is normalised to the full-strength anchor,
 * so a portal showing three insights leads with a genuinely good conversion rate
 * and buries a mediocre one.
 */
export function captationInsight(current: OverviewRow): Insight | null {
  if (current.uniques < MIN_CAPTATION_UNIQUES) return null;
  if (current.leads < 1) return null;

  const rate = current.leads / current.uniques;
  const oneIn = Math.round(current.uniques / current.leads);
  // « 1 personne sur 1 » is not a sentence, and a 100 % rate is a seeding
  // artefact or a bot rather than a headline.
  if (oneIn < 2) return null;

  // The sentence asserts 1/oneIn. Only say it when that is what the data says.
  if (Math.abs(rate - 1 / oneIn) > MAX_CAPTATION_ROUNDING_DRIFT) return null;

  return {
    id: 'captation',
    strength: clamp01(rate / CAPTATION_RATE_FOR_FULL_STRENGTH),
    lead: '',
    emphasis: `1 personne sur ${formatNumber(oneIn)}`,
    tail: ' vous laisse ses coordonnées.',
  };
}

/**
 * « +38 % de scans par rapport à la période précédente. »
 *
 * Silent without a previous period, which is the « Tout » preset: `trendNote`
 * in kpis.ts already says so beneath the tiles, and a second voice repeating it
 * here would turn an honest disclosure into nagging.
 *
 * `strength` is the magnitude of the move regardless of direction, normalised to
 * the full-strength anchor. A 60 % fall is as much a temps fort as a 60 % rise,
 * and hiding it would be exactly the flattery §4.6 exists to prevent.
 */
export function trendInsight(
  current: OverviewRow,
  previous: OverviewRow,
  hasPrevious: boolean,
): Insight | null {
  if (!hasPrevious) return null;
  if (previous.scans < MIN_TREND_SCANS) return null;

  const delta = (current.scans - previous.scans) / previous.scans;
  if (Math.abs(delta) < MIN_TREND_DELTA) return null;

  return {
    id: 'tendance',
    strength: clamp01(Math.abs(delta) / TREND_DELTA_FOR_FULL_STRENGTH),
    lead: '',
    emphasis: formatSignedPercent(delta),
    tail: ' de scans par rapport à la période précédente.',
  };
}
