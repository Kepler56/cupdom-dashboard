import { describe, expect, it } from 'vitest';
import {
  captationInsight,
  CAPTATION_RATE_FOR_FULL_STRENGTH,
  citiesInsight,
  deviceInsight,
  dropoffInsight,
  MAX_CAPTATION_ROUNDING_DRIFT,
  MAX_INSIGHTS,
  MIN_CAPTATION_UNIQUES,
  MIN_CITIES_SHARE,
  MIN_DEVICE_SHARE,
  MIN_TREND_DELTA,
  MIN_TREND_SCANS,
  peakInsight,
  selectInsights,
  TREND_DELTA_FOR_FULL_STRENGTH,
  trendInsight,
  type Insight,
} from '@/lib/analytics/insights';
import { buildFunnel } from '@/lib/analytics/funnel';
import { buildHeatmap } from '@/lib/analytics/heatmap';
import { buildRanking, type Ranking } from '@/lib/analytics/ranking';
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

  it('rejects a rate that drifts too far from the claimed fraction (45% claimed as 1/2)', () => {
    // uniques 100, leads 45 | real 45.0% | sentence « 1 personne sur 2 » implies 50.0%
    // Drift = |0.45 - 0.5| = 0.05, which exceeds MAX_CAPTATION_ROUNDING_DRIFT (0.02)
    expect(captationInsight(bucket({ uniques: 100, leads: 45 }))).toBeNull();
  });

  it('keeps a rate that drifts just within the tolerance', () => {
    // Construct a rate that is 1/3 ± 0.019 (just inside the 0.02 tolerance)
    // Rate = 1/3 + 0.019 = 0.352, so leads = 0.352 * uniques
    // With uniques = 1000, leads = 352
    // oneIn = Math.round(1000 / 352) = 3
    // claimed rate = 1/3 ≈ 0.333, drift = |0.352 - 0.333| ≈ 0.019 < 0.02
    const insight = captationInsight(bucket({ uniques: 1000, leads: 352 }));
    expect(insight).not.toBeNull();
    expect(insight?.emphasis).toBe('1 personne sur 3');
  });

  it('rejects a rate that drifts just outside the tolerance', () => {
    // Rate = 1/3 + 0.021 (just outside the 0.02 tolerance)
    // leads = 0.354 * 1000 = 354
    // oneIn = Math.round(1000 / 354) = 3
    // claimed rate = 1/3 ≈ 0.333, drift = |0.354 - 0.333| ≈ 0.021 > 0.02
    expect(captationInsight(bucket({ uniques: 1000, leads: 354 }))).toBeNull();
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

describe('peakInsight', () => {
  it('names the busiest hour and what share of the period it carried', () => {
    // 60 scans on Saturday at 23 h, 40 spread elsewhere: the peak is 60 % of 100.
    const insight = peakInsight(
      buildHeatmap([
        { dow: 6, hour: 23, scans: 60 },
        { dow: 2, hour: 12, scans: 40 },
      ]),
    );
    expect(insight?.emphasis).toBe('samedi 23 h');
    expect(insight?.lead).toBe('Votre pic : ');
    expect(insight?.tail).toContain('de vos scans sur la période');
  });

  it('stays silent when buildHeatmap itself refused to name a peak', () => {
    // Below MIN_HEATMAP_VOLUME the heatmap returns peak: null. This insight
    // must inherit that judgement rather than form its own.
    expect(peakInsight(buildHeatmap([{ dow: 6, hour: 23, scans: 3 }]))).toBeNull();
  });

  it('stays silent on an empty window', () => {
    expect(peakInsight(buildHeatmap([]))).toBeNull();
  });
});

describe('citiesInsight', () => {
  const cities = (...counts: number[]) =>
    buildRanking(counts.map((scans, i) => ({ label: `Ville${i}`, scans })));

  it('names the top three and their combined share', () => {
    const insight = citiesInsight(buildRanking([
      { label: 'Paris', scans: 400 },
      { label: 'Lyon', scans: 150 },
      { label: 'Marseille', scans: 70 },
      { label: 'Lille', scans: 380 },
    ]));
    // Ranked by scans: Paris, Lille, Lyon.
    expect(insight?.emphasis).toBe('Paris, Lille, Lyon');
    expect(insight?.tail).toContain('de votre audience');
  });

  it('stays silent when the ranking is too thin for its own percentages', () => {
    expect(citiesInsight(cities(5, 4, 3))).toBeNull();
  });

  it('stays silent when the top three do not actually concentrate anywhere', () => {
    // Twelve cities of equal size: the top three hold a quarter, which is not a
    // finding, it is a flat distribution.
    expect(citiesInsight(cities(...Array(12).fill(50)))).toBeNull();
  });

  it('never builds the sentence out of « Inconnu »', () => {
    // UNKNOWN_LABEL is what the RPC coalesces a missing city to. « Inconnu,
    // Paris, Lyon = 71 % de votre audience » is a sentence about our data
    // quality wearing the costume of a sentence about their audience.
    const insight = citiesInsight(buildRanking([
      { label: 'Inconnu', scans: 500 },
      { label: 'Paris', scans: 300 },
      { label: 'Lyon', scans: 200 },
      { label: 'Lille', scans: 100 },
    ]));
    expect(insight?.emphasis).not.toContain('Inconnu');
  });

  it('needs at least two cities — one city is the geography card doing its job', () => {
    expect(citiesInsight(buildRanking([{ label: 'Paris', scans: 500 }]))).toBeNull();
  });

  it('never names the rolled-up « Autres » row as a place', () => {
    // buildRanking always appends « Autres » AFTER the sorted head, so it can
    // never reach the top three through buildRanking itself — the guard that
    // filters it out is untestable via the pipeline. Hand-build the Ranking so
    // the guard actually has to fire.
    const withOther: Ranking = {
      rows: [
        { label: 'Autres', scans: 500, scansLabel: '500', uniques: null, uniquesLabel: null, share: 0.5, shareLabel: '50 %', isOther: true },
        { label: 'Paris', scans: 300, scansLabel: '300', uniques: null, uniquesLabel: null, share: 0.3, shareLabel: '30 %', isOther: false },
        { label: 'Lyon', scans: 200, scansLabel: '200', uniques: null, uniquesLabel: null, share: 0.2, shareLabel: '20 %', isOther: false },
      ],
      total: 1000,
      totalLabel: '1 000',
      empty: false,
      enoughData: true,
    };
    expect(citiesInsight(withOther)!.emphasis).toBe('Paris, Lyon');
  });

  it('qualifies exactly AT the concentration floor', () => {
    // Total 1 000, exactly reproduced as an integer division so the sum is not
    // subject to accumulated floating-point drift: 200 + 100 + 100 scans out of
    // 1 000 is a share of 0.2 + 0.1 + 0.1, which sums to the EXACT double for
    // 0.4 (verified: 0.2 + 0.1 + 0.1 === 0.4 is true in IEEE-754 for this
    // specific triple, unlike the more famous 0.1 + 0.2 !== 0.3).
    const atFloor = citiesInsight(buildRanking([
      { label: 'Paris', scans: 200 },
      { label: 'Lyon', scans: 100 },
      { label: 'Marseille', scans: 100 },
      // Ten filler cities below the top three, summing to the remaining 600,
      // so the ranking's total is exactly 1 000 and none of them outranks
      // Lyon or Marseille.
      ...Array.from({ length: 10 }, (_, i) => ({ label: `Ville${i}`, scans: 60 })),
    ]));
    expect(atFloor).not.toBeNull();
    expect(atFloor!.strength).toBe(0);
  });

  it('scores a barely-qualifying concentration near zero, not near its floor', () => {
    // Same shape as the floor fixture, but the top three clear 0.4 by exactly
    // one point: 210 + 100 + 100 out of 1 000 is a share of 0.41 (again exact
    // in IEEE-754 for this triple). Un-normalised, clamp01(share) would read
    // 0.41 — nowhere near zero. Normalised against the floor,
    // (0.41 - 0.4) / (1 - 0.4) = 0.01 / 0.6 ≈ 0.0167, which IS near zero.
    const barelyQualifying = citiesInsight(buildRanking([
      { label: 'Paris', scans: 210 },
      { label: 'Lyon', scans: 100 },
      { label: 'Marseille', scans: 100 },
      ...Array.from({ length: 10 }, (_, i) => ({ label: `Ville${i}`, scans: 59 })),
    ]));
    expect(barelyQualifying).not.toBeNull();
    expect(barelyQualifying!.strength).toBeGreaterThan(0);
    expect(barelyQualifying!.strength).toBeLessThan(0.05);
  });
});

describe('deviceInsight', () => {
  it('quotes the dominant system, named as the data names it', () => {
    const insight = deviceInsight(buildRanking([
      { label: 'iOS', scans: 870 },
      { label: 'Android', scans: 130 },
    ]));
    expect(insight?.emphasis).toBe('87 %');
    // NOT « iPhone ». See Known gaps 1.
    expect(insight?.tail).toContain('iOS');
    expect(insight?.tail).not.toContain('iPhone');
  });

  it('stays silent when no system dominates', () => {
    expect(
      deviceInsight(buildRanking([
        { label: 'iOS', scans: 500 },
        { label: 'Android', scans: 500 },
      ])),
    ).toBeNull();
  });

  it('stays silent below the ranking volume floor', () => {
    expect(deviceInsight(buildRanking([{ label: 'iOS', scans: 9 }]))).toBeNull();
  });

  it('qualifies exactly AT the dominance floor', () => {
    // 600 of 1 000 is a share of exactly 0.6 in IEEE-754 (600 / 1000 === 0.6).
    const atFloor = deviceInsight(buildRanking([
      { label: 'iOS', scans: 600 },
      { label: 'Android', scans: 400 },
    ]));
    expect(atFloor).not.toBeNull();
    expect(atFloor!.strength).toBe(0);
  });

  it('scores a barely-dominant system near zero, not near its floor', () => {
    // 610 of 1 000 is a share of exactly 0.61 in IEEE-754. Un-normalised,
    // clamp01(share) would read 0.61. Normalised, (0.61 - 0.6) / (1 - 0.6) =
    // 0.01 / 0.4 = 0.025, which is near zero.
    const barelyQualifying = deviceInsight(buildRanking([
      { label: 'iOS', scans: 610 },
      { label: 'Android', scans: 390 },
    ]));
    expect(barelyQualifying).not.toBeNull();
    expect(barelyQualifying!.strength).toBeGreaterThan(0);
    expect(barelyQualifying!.strength).toBeLessThan(0.05);
  });
});

describe('dropoffInsight', () => {
  const funnel = () =>
    buildFunnel(
      { distribues: 5000, scannes: 1000, formulaire_vu: 900, formulaire_soumis: 380, offre_atteinte: 350 },
      { distributionComplete: true },
    );

  it(`reuses the funnel\u2019s own wording rather than inventing a second one`, () => {
    const insight = dropoffInsight(funnel())!;
    expect(insight.lead).toContain('Votre plus gros décrochage');
    // The funnel names « Formulaire envoyé » as the step lost the most people.
    expect(insight.lead.toLowerCase()).toContain('formulaire envoyé');
    expect(insight.tail).toContain(`s\u2019arrêtent avant cette étape`);
  });

  it('scores a worse drop-off as the stronger insight', () => {
    const bad = dropoffInsight(funnel())!;
    const mild = dropoffInsight(
      buildFunnel(
        { distribues: 5000, scannes: 1000, formulaire_vu: 900, formulaire_soumis: 800, offre_atteinte: 790 },
        { distributionComplete: true },
      ),
    )!;
    expect(bad.strength).toBeGreaterThan(mild.strength);
  });

  it('stays silent when buildFunnel refused to name a worst drop', () => {
    const thin = buildFunnel(
      { distribues: 10, scannes: 5, formulaire_vu: 4, formulaire_soumis: 1, offre_atteinte: 1 },
      { distributionComplete: true },
    );
    expect(dropoffInsight(thin)).toBeNull();
  });

  it('reproduces the funnel’s own sentence exactly, rather than a second phrasing of it', () => {
    const view = funnel();
    const insight = dropoffInsight(view)!;
    expect(insight.lead + insight.emphasis + insight.tail).toBe(view.worstDrop!.sentence);
  });

  it('flags itself as campaign-lifetime, since client_funnel takes no period', () => {
    // Spec §4.9. Kept out of `tail` on purpose — see the invariant test above,
    // which pins `lead + emphasis + tail` to `worstDrop.sentence` exactly.
    expect(dropoffInsight(funnel())!.note).toBe('depuis le début');
  });
});

describe('note', () => {
  it('is optional: a period-scoped generator leaves it unset', () => {
    // Only dropoffInsight is not period-scoped (spec §4.9); every other
    // generator must NOT carry a caveat, or the field would read as universal
    // rather than as the one exception it is.
    const insight = peakInsight(
      buildHeatmap([
        { dow: 6, hour: 23, scans: 60 },
        { dow: 2, hour: 12, scans: 40 },
      ]),
    );
    expect(insight?.note).toBeUndefined();
  });
});
