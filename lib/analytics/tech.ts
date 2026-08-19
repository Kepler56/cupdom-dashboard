import { buildRanking, type Ranking } from './ranking';
import type { TechRow } from './types';

export type TechDimension = 'device_type' | 'os' | 'browser' | 'language';

export const TECH_SECTIONS = Object.freeze([
  { id: 'device_type', label: 'Appareil', hint: 'Sur quoi votre page doit être belle en premier.' },
  { id: 'os', label: 'Système', hint: null },
  { id: 'browser', label: 'Navigateur', hint: null },
  { id: 'language', label: 'Langue', hint: 'La langue du navigateur, pas celle du scan.' },
] as const satisfies readonly { id: TechDimension; label: string; hint: string | null }[]);

const DEVICE_LABELS: Record<string, string> = {
  mobile: 'Mobile',
  desktop: 'Ordinateur',
  tablet: 'Tablette',
};

const LANGUAGE_LABELS: Record<string, string> = {
  fr: 'Français',
  en: 'Anglais',
  es: 'Espagnol',
  de: 'Allemand',
  it: 'Italien',
  nl: 'Néerlandais',
  pt: 'Portugais',
  ar: 'Arabe',
};

/**
 * Raw dimension value → what a sponsor should read.
 *
 * Only device types and language codes are translated. OS and browser names are
 * proper nouns: « iOS » and « Safari » are already what the client would say,
 * and maintaining a mapping for every user-agent string that ever appears is a
 * list that goes stale silently. Anything unrecognised passes through rather
 * than being hidden or bucketed — including 'Inconnu', which the RPC already
 * supplies for missing values.
 */
export function humanTechLabel(dimension: TechDimension, raw: string): string {
  if (dimension === 'device_type') return DEVICE_LABELS[raw.toLowerCase()] ?? raw;
  if (dimension === 'language') {
    const base = raw.toLowerCase().split('-')[0];
    return LANGUAGE_LABELS[base] ?? raw;
  }
  return raw;
}

/**
 * Split the RPC's four-dimensions-in-one-result-set into four rankings.
 *
 * Shares are computed WITHIN a dimension: 88 % mobile means 88 % of scans came
 * from a phone, not 88 % of every technology row. A dimension the RPC does not
 * define is ignored rather than rendered as an unnamed section.
 *
 * Rows are re-aggregated on the HUMANISED label, and the order matters: the
 * scan function stores the raw first Accept-Language token, so `fr-FR`, `fr`,
 * `fr-fr` and `fr-CA` reach us as four distinct database rows that
 * `humanTechLabel` then collapses to one « Français ». Mapping one output row
 * per input row would render « Langue » as several bars all reading
 * « Français » — fragmented shares, real signal pushed into « Autres » by the
 * twelve-row cap, and duplicate React keys in `RankedBars`. Aggregating BEFORE
 * humanisation would not work either: `fr-FR` and `fr` are different keys until
 * the label function has made them the same word. Same story for `device_type`,
 * where casing varies.
 */
export function groupTech(rows: TechRow[]): Record<TechDimension, Ranking> {
  const out = {} as Record<TechDimension, Ranking>;

  for (const section of TECH_SECTIONS) {
    const totals = new Map<string, number>();
    for (const r of rows.filter((r) => r.dimension === section.id)) {
      const label = humanTechLabel(section.id, r.label);
      totals.set(label, (totals.get(label) ?? 0) + r.scans);
    }
    out[section.id] = buildRanking([...totals].map(([label, scans]) => ({ label, scans })));
  }

  return out;
}
