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
  /** True when no campaign in the selection has a distributed_count. */
  distributionUnknown: boolean;
  worstDrop: { id: FunnelStageId; label: string; dropLabel: string; sentence: string } | null;
}

/**
 * Below this many people at the top, naming a "biggest drop-off" is
 * storytelling rather than analysis. Spec §4.6-3.
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
 */
export function buildFunnel(row: FunnelRow): FunnelView {
  const distributionUnknown = !row.distribues || row.distribues <= 0;

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

  return { stages, distributionUnknown, worstDrop: pickWorstDrop(stages, reference) };
}

function pickWorstDrop(stages: FunnelStage[], reference: number): FunnelView['worstDrop'] {
  if (reference < MIN_FUNNEL_VOLUME) return null;

  let worst: FunnelStage | null = null;
  let worstValue = 0;
  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index];
    // The distribués -> scannés step is excluded from candidacy. It is almost
    // always the largest drop AND it is structural: most covers handed out are
    // simply never scanned. Left in, it would win every single time while
    // telling the sponsor nothing they can act on. The losses worth naming are
    // the ones they can change - the landing page and the form.
    if (index > 0 && stages[index - 1].id === 'distribues') continue;
    if (stage.drop !== null && stage.drop > worstValue) {
      worst = stage;
      worstValue = stage.drop;
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
