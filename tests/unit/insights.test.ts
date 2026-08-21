import { describe, expect, it } from 'vitest';
import {
  captationInsight,
  MAX_INSIGHTS,
  MIN_CAPTATION_UNIQUES,
  MIN_TREND_DELTA,
  MIN_TREND_SCANS,
  selectInsights,
  trendInsight,
  type Insight,
} from '@/lib/analytics/insights';
import type { OverviewRow } from '@/lib/analytics/types';

const insight = (id: Insight['id'], strength: number): Insight => ({
  id,
  strength,
  lead: '',
  emphasis: id,
  tail: '.',
});

describe('selectInsights', () => {
  it('drops the insights that did not qualify', () => {
    expect(selectInsights([insight('pic', 0.5), null, insight('villes', 0.4)]).map((i) => i.id)).toEqual([
      'pic',
      'villes',
    ]);
  });

  it('ranks the strongest first', () => {
    const ranked = selectInsights([insight('villes', 0.2), insight('pic', 0.9), insight('appareil', 0.5)]);
    expect(ranked.map((i) => i.id)).toEqual(['pic', 'appareil', 'villes']);
  });

  it('shows at most three, because the spec says three', () => {
    const many = [
      insight('pic', 0.9),
      insight('villes', 0.8),
      insight('appareil', 0.7),
      insight('captation', 0.6),
      insight('tendance', 0.5),
    ];
    expect(selectInsights(many).map((i) => i.id)).toEqual(['pic', 'villes', 'appareil']);
    expect(selectInsights(many)).toHaveLength(MAX_INSIGHTS);
  });

  it('breaks a tie the same way every time, so the strip does not reshuffle between loads', () => {
    // Two insights with IDENTICAL strength. Array.prototype.sort is stable, so
    // input order would silently decide this — and the input order is the order
    // the page happens to call the generators in. The explicit family tiebreak
    // is what makes the outcome a decision rather than an accident.
    const a = selectInsights([insight('appareil', 0.5), insight('tendance', 0.5)]);
    const b = selectInsights([insight('tendance', 0.5), insight('appareil', 0.5)]);
    expect(a.map((i) => i.id)).toEqual(b.map((i) => i.id));
    expect(a[0].id).toBe('tendance');
  });

  it('returns nothing when nothing qualified', () => {
    expect(selectInsights([null, null])).toEqual([]);
  });
});

const bucket = (over: Partial<OverviewRow> = {}): OverviewRow => ({
  bucket: 'current',
  scans: 1000,
  uniques: 400,
  leads: 100,
  ...over,
});

describe('captationInsight', () => {
  it('states the rate as a proportion of people, the way a sponsor would say it', () => {
    const insight = captationInsight(bucket({ uniques: 400, leads: 100 }));
    expect(insight?.emphasis).toBe('1 personne sur 4');
    expect(insight?.tail).toContain('vous laisse ses coordonnées');
  });

  it('says nothing at all below the volume floor, rather than saying it weakly', () => {
    expect(captationInsight(bucket({ uniques: MIN_CAPTATION_UNIQUES - 1, leads: 10 }))).toBeNull();
  });

  it('qualifies exactly AT the floor', () => {
    expect(captationInsight(bucket({ uniques: MIN_CAPTATION_UNIQUES, leads: 10 }))).not.toBeNull();
  });

  it('says nothing when nobody has been captured — that is an empty state, not an insight', () => {
    expect(captationInsight(bucket({ uniques: 500, leads: 0 }))).toBeNull();
  });

  it('refuses to claim « 1 personne sur 1 »', () => {
    // Every single visitor converting is a seeding artefact or a bot, not a
    // headline. It is also not a sentence anyone would write.
    expect(captationInsight(bucket({ uniques: 60, leads: 60 }))).toBeNull();
  });

  it('scores a better rate as the stronger insight', () => {
    const good = captationInsight(bucket({ uniques: 400, leads: 100 }))!;
    const poor = captationInsight(bucket({ uniques: 400, leads: 20 }))!;
    expect(good.strength).toBeGreaterThan(poor.strength);
  });
});

describe('trendInsight', () => {
  it('quotes the signed change against the previous period', () => {
    const insight = trendInsight(bucket({ scans: 1380 }), bucket({ bucket: 'previous', scans: 1000 }), true);
    // U+00A0 (REGULAR no-break space) before the % sign, NOT U+202F, which is
    // the narrow one Intl uses between thousands. format.ts distinguishes them
    // and the difference is invisible in review. Measured, not assumed.
    expect(insight?.emphasis).toBe('+38 %');
    expect(insight?.tail).toContain('période précédente');
  });

  it('says nothing when there is no previous period to compare with', () => {
    // The « Tout » preset. trendNote already explains this on screen; a second
    // voice saying it in the highlights strip would be noise.
    expect(trendInsight(bucket({ scans: 2000 }), bucket({ bucket: 'previous', scans: 1000 }), false)).toBeNull();
  });

  it('says nothing when the previous period is too thin to be a baseline', () => {
    expect(
      trendInsight(bucket({ scans: 500 }), bucket({ bucket: 'previous', scans: MIN_TREND_SCANS - 1 }), true),
    ).toBeNull();
  });

  it('ignores a move too small to be a temps fort', () => {
    const previous = bucket({ bucket: 'previous', scans: 1000 });
    const barelyMoved = Math.round(1000 * (1 + MIN_TREND_DELTA / 2));
    expect(trendInsight(bucket({ scans: barelyMoved }), previous, true)).toBeNull();
  });

  it('reports a fall as readily as a rise', () => {
    const insight = trendInsight(bucket({ scans: 600 }), bucket({ bucket: 'previous', scans: 1000 }), true);
    // ASCII hyphen, not U+2212 MINUS SIGN. Verified against this Node build's
    // fr-FR ICU data rather than assumed; the two are identical on screen.
    expect(insight?.emphasis).toBe('-40 %');
  });
});

