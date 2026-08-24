import { formatNumber, formatPercent } from './format';
import type { FunnelRow } from './types';

export type FunnelStageId =
  | 'distribues'
  | 'scannes'
  | 'formulaire_vu'
  | 'formulaire_soumis'
  | 'offre_atteinte';

export interface FunnelStage {
  id: FunnelStageId;
  label: string;
  value: number;
  valueLabel: string;
  /** 0..1 of the first rendered stage — the bar width. Clamped to 1. */
  share: number;
  /** Loss from the previous rendered stage, 0..1. Null on the first stage. */
  drop: number | null;
  dropLabel: string | null;
}

export interface FunnelView {
  stages: FunnelStage[];
  /**
   * True when the distribution total is not usable as a denominator — either no
   * count at all, or a PARTIAL one (at least one campaign in the selection has
   * no distributed_count). See `buildFunnel`'s `distributionComplete` option.
   */
  distributionUnknown: boolean;
  worstDrop: { id: FunnelStageId; label: string; dropLabel: string; sentence: string } | null;
}

/**
 * Below this many people AT THE BASE OF A STEP, naming that step the "biggest
 * drop-off" is storytelling rather than analysis. Spec §4.6-3.
 *
 * The floor is on the step's own denominator, not on the head of the funnel: a
 * large print run whose scans have barely started is exactly what a campaign
 * looks like in week one, and 500 distribués would otherwise license
 * « 100 % de décrochage » computed over one person.
 */
export const MIN_FUNNEL_VOLUME = 20;

const LABELS: Record<FunnelStageId, string> = {
  distribues: 'Distribués',
  scannes: 'Scannés',
  formulaire_vu: 'Formulaire vu',
  formulaire_soumis: 'Formulaire envoyé',
  offre_atteinte: 'Offre atteinte',
};

/**
 * The five-stage parcours, campaign lifetime.
 *
 * This view model never takes a date range, and that is the point: `distribues`
 * is a campaign total, so a funnel filtered to seven days whose first stage
 * still showed the all-time count would be silently, flatteringly wrong
 * (spec §4.9). The UI labels it « depuis le début ».
 *
 * `distributionComplete` is all-or-nothing, and for good reason. `client_funnel` sums
 * `coalesce(distributed_count, 0)` over every campaign in scope, so a selection
 * where one campaign has a count and another does not yields a PARTIAL total —
 * 500 distribués against 5 200 scans. Measuring shares against that denominator
 * is wrong in the flattering direction and renders visibly broken (« 0 % de
 * perte » between 500 and 5 200). The caller knows which campaigns are in scope
 * and is the only one who can tell; absent the option we assume completeness so
 * a bare `buildFunnel(row)` keeps its historical meaning.
 */
export function buildFunnel(row: FunnelRow, options?: { distributionComplete?: boolean }): FunnelView {
  const distributionUnknown =
    options?.distributionComplete === false || !row.distribues || row.distribues <= 0;

  const all: { id: FunnelStageId; value: number }[] = [
    { id: 'distribues', value: row.distribues ?? 0 },
    { id: 'scannes', value: row.scannes ?? 0 },
    { id: 'formulaire_vu', value: row.formulaire_vu ?? 0 },
    { id: 'formulaire_soumis', value: row.formulaire_soumis ?? 0 },
    { id: 'offre_atteinte', value: row.offre_atteinte ?? 0 },
  ];

  // An unset distributed_count is a missing input, not zero covers handed out.
  // Dropping the stage is honest; rendering "0 distribués" is a false number.
  const kept = distributionUnknown ? all.slice(1) : all;
  const reference = kept[0]?.value ?? 0;

  const stages: FunnelStage[] = kept.map((stage, index) => {
    const previous = index === 0 ? null : kept[index - 1].value;
    // Non-monotonic funnels are legitimate — the three funnel_events kinds are
    // independent and a visitor can reach the offer without submitting the
    // form — so a "negative loss" is clamped away rather than rendered.
    const drop = previous !== null && previous > 0 ? Math.max(0, (previous - stage.value) / previous) : null;

    return {
      id: stage.id,
      label: LABELS[stage.id],
      value: stage.value,
      valueLabel: formatNumber(stage.value),
      share: reference > 0 ? Math.min(1, stage.value / reference) : 0,
      drop,
      dropLabel: drop === null ? null : formatPercent(drop),
    };
  });

  return { stages, distributionUnknown, worstDrop: pickWorstDrop(stages) };
}

function pickWorstDrop(stages: FunnelStage[]): FunnelView['worstDrop'] {
  let worst: FunnelStage | null = null;
  let worstDropRatio = 0;
  for (let index = 1; index < stages.length; index += 1) {
    const stage = stages[index];
    // The distribués -> scannés step is excluded from candidacy. It is almost
    // always the largest drop AND it is structural: most covers handed out are
    // simply never scanned. Left in, it would win every single time while
    // telling the sponsor nothing they can act on. The losses worth naming are
    // the ones they can change - the landing page and the form.
    if (stages[index - 1].id === 'distribues') continue;
    // The floor guards THIS step's denominator, which is the number the drop is
    // actually computed over. Gating on the head of the funnel instead would let
    // 500 distribués authorise a « 100 % de décrochage » measured over one person.
    if (stages[index - 1].value < MIN_FUNNEL_VOLUME) continue;
    if (stage.drop !== null && stage.drop > worstDropRatio) {
      worst = stage;
      worstDropRatio = stage.drop;
    }
  }

  if (!worst || worst.dropLabel === null) return null;

  return {
    id: worst.id,
    label: worst.label,
    dropLabel: worst.dropLabel,
    sentence: `Votre plus gros décrochage : ${worst.label.toLowerCase()} — ${worst.dropLabel} des personnes s’arrêtent avant cette étape.`,
  };
}
