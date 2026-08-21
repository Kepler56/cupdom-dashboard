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
