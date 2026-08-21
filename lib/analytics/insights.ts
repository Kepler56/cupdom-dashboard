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

import { formatNumber, formatPercent, formatSignedPercent } from './format';
import type { OverviewRow } from './types';
import type { FunnelView } from './funnel';
import type { Heatmap } from './heatmap';
import { UNKNOWN_LABEL, type Ranking } from './ranking';

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

/**
 * The share at which a single hour is as concentrated as this scale records.
 *
 * One cell out of 168 holding a quarter of a period's scans is an extreme
 * concentration; past that the sentence is not more interesting, so the score
 * saturates rather than letting one freakish hour outrank every other insight
 * forever.
 */
export const PEAK_SHARE_FOR_FULL_STRENGTH = 0.25;

/** Below this, the top three cities are a flat distribution, not a finding. */
export const MIN_CITIES_SHARE = 0.4;

/** Below this, no system dominates and « la plupart » would be a stretch. */
export const MIN_DEVICE_SHARE = 0.6;

/** How many places the cities sentence names. */
const CITIES_NAMED = 3;

/**
 * « Votre pic : samedi 23 h — 34 % de vos scans sur la période. »
 *
 * The spec's example says « de vos scans du week-end »; this says « sur la
 * période ». `buildHeatmap` totals the whole window and a weekend sub-total
 * would be a seventh aggregate for one clause — see Known gaps 2. The smaller
 * true number is worth more than the larger ambiguous one.
 *
 * The volume judgement is entirely `buildHeatmap`'s: it returns `peak: null`
 * below MIN_HEATMAP_VOLUME, and inheriting that is the point of taking the view
 * model rather than the rows.
 */
export function peakInsight(heatmap: Heatmap): Insight | null {
  if (!heatmap.peak || heatmap.total <= 0) return null;

  const share = heatmap.peak.scans / heatmap.total;

  return {
    id: 'pic',
    strength: clamp01(share / PEAK_SHARE_FOR_FULL_STRENGTH),
    lead: 'Votre pic : ',
    emphasis: heatmap.peak.label,
    tail: ` — ${formatPercent(share)} de vos scans sur la période.`,
  };
}

/**
 * « Paris, Lyon, Marseille = 62 % de votre audience. »
 *
 * `Inconnu` is excluded before the top three are taken. It is what the RPC
 * coalesces a missing city to, and a sentence led by it would be a statement
 * about our geolocation coverage dressed as a statement about their audience —
 * the precise species of misleading number §4.6 is written against.
 *
 * The rolled-up « Autres » row is excluded for the same reason: it is a
 * container, not a place.
 *
 * `strength` is how far past the qualifying bar the top three have reached.
 * At MIN_CITIES_SHARE it is zero; at full concentration (1.0) it is one.
 * This prevents a barely-qualifying city insight from outranking a real trend
 * merely because the bar itself is high.
 */
export function citiesInsight(geo: Ranking): Insight | null {
  if (!geo.enoughData || geo.empty) return null;

  const named = geo.rows
    .filter((row) => !row.isOther && row.label !== UNKNOWN_LABEL)
    .slice(0, CITIES_NAMED);

  // One city is what the geography card already shows at a glance. The insight
  // earns its place by summarising a distribution, which needs a distribution.
  if (named.length < 2) return null;

  const share = named.reduce((sum, row) => sum + row.share, 0);
  if (share < MIN_CITIES_SHARE) return null;

  return {
    id: 'villes',
    strength: clamp01((share - MIN_CITIES_SHARE) / (1 - MIN_CITIES_SHARE)),
    lead: '',
    emphasis: named.map((row) => row.label).join(', '),
    tail: ` = ${formatPercent(share)} de votre audience.`,
  };
}

/**
 * « 87 % de vos scans viennent d’un appareil iOS. »
 *
 * The spec writes « scannent sur iPhone ». We record an OS, and an iPad is iOS
 * too — see Known gaps 1. The label passes through exactly as `humanTechLabel`
 * left it, because OS names are proper nouns the sponsor already uses.
 *
 * `strength` is how far past the dominance bar the top system has reached.
 * At MIN_DEVICE_SHARE it is zero; at full market share (1.0) it is one.
 * This prevents a barely-qualifying device insight from outranking a real trend
 * merely because the bar itself is high.
 */
export function deviceInsight(systems: Ranking): Insight | null {
  if (!systems.enoughData || systems.empty) return null;

  const top = systems.rows.find((row) => !row.isOther && row.label !== UNKNOWN_LABEL);
  if (!top || top.share < MIN_DEVICE_SHARE) return null;

  return {
    id: 'appareil',
    strength: clamp01((top.share - MIN_DEVICE_SHARE) / (1 - MIN_DEVICE_SHARE)),
    lead: '',
    emphasis: top.shareLabel,
    tail: ` de vos scans viennent d’un appareil ${top.label}.`,
  };
}

/**
 * « Votre plus gros décrochage : formulaire envoyé — 58 % des personnes
 * s’arrêtent avant cette étape. »
 *
 * The wording is `buildFunnel`'s, re-split at its emphasis rather than
 * rewritten. Two phrasings of the same fact, one under the funnel chart and one
 * in the strip above it, would eventually disagree — and the reader would be
 * right to trust neither.
 *
 * The strength needs the raw ratio, which `worstDrop` does not carry; it is
 * read back off the stage it names. Widening `worstDrop` to carry the same fact
 * in a second format is how the two formats drift apart.
 */
export function dropoffInsight(funnel: FunnelView): Insight | null {
  const worst = funnel.worstDrop;
  if (!worst) return null;

  const ratio = funnel.stages.find((stage) => stage.id === worst.id)?.drop ?? 0;

  return {
    id: 'decrochage',
    strength: clamp01(ratio),
    lead: `Votre plus gros décrochage : ${worst.label.toLowerCase()} — `,
    emphasis: worst.dropLabel,
    tail: ` des personnes s’arrêtent avant cette étape.`,
  };
}

