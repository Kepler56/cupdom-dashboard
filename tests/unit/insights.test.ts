import { describe, expect, it } from 'vitest';
import {
  captationInsight,
  CAPTATION_RATE_FOR_FULL_STRENGTH,
  citiesInsight,
  CITIES_SHARE_FOR_FULL_STRENGTH,
  deviceInsight,
  DEVICE_SHARE_FOR_FULL_STRENGTH,
  dropoffInsight,
  DROPOFF_RATIO_FOR_FULL_STRENGTH,
  MAX_CAPTATION_ROUNDING_DRIFT,
  MAX_INSIGHTS,
  MIN_CAPTATION_UNIQUES,
  MIN_CITIES_INSIGHT_VOLUME,
  MIN_CITIES_SHARE,
  MIN_DEVICE_INSIGHT_VOLUME,
  MIN_DEVICE_SHARE,
  MIN_TREND_DELTA,
  MIN_TREND_SCANS,
  PEAK_SHARE_FOR_FULL_STRENGTH,
  peakInsight,
  selectInsights,
  TREND_DELTA_FOR_FULL_STRENGTH,
  trendInsight,
  type Insight,
} from '@/lib/analytics/insights';
import { buildFunnel } from '@/lib/analytics/funnel';
import { buildHeatmap } from '@/lib/analytics/heatmap';
import { buildRanking, MIN_RANKING_VOLUME, type Ranking } from '@/lib/analytics/ranking';
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

  it('I3: stays silent below MIN_CITIES_INSIGHT_VOLUME even when MIN_RANKING_VOLUME is cleared', () => {
    // Total 30: clears MIN_RANKING_VOLUME (20), so `geo.enoughData` is true and
    // the /audience ranked-bars card would render these shares without a
    // low-data note. The top three are 100 % of the total (a first-visit-sized
    // sample splits almost however it likes), which clears MIN_CITIES_SHARE
    // too — so the ONLY thing standing between this fixture and a bare « 100 %
    // de votre audience » headline is the strip's own, stricter floor.
    const total = 30;
    expect(total).toBeGreaterThanOrEqual(MIN_RANKING_VOLUME);
    expect(total).toBeLessThan(MIN_CITIES_INSIGHT_VOLUME);
    const thin = buildRanking([
      { label: 'Paris', scans: 18 },
      { label: 'Lyon', scans: 8 },
      { label: 'Marseille', scans: 4 },
    ]);
    expect(thin.enoughData).toBe(true); // MIN_RANKING_VOLUME is cleared
    expect(citiesInsight(thin)).toBeNull(); // MIN_CITIES_INSIGHT_VOLUME is not
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

  it('I3: stays silent below MIN_DEVICE_INSIGHT_VOLUME even when MIN_RANKING_VOLUME is cleared', () => {
    // Total 30: clears MIN_RANKING_VOLUME (20) but not the strip's own,
    // stricter floor. iOS is 25 of 30 = 83 %, clearing MIN_DEVICE_SHARE too —
    // a brand-new sponsor's first visit should not headline « 100 % de vos
    // scans viennent d'un système iOS » on a 30-scan sample.
    const total = 30;
    expect(total).toBeGreaterThanOrEqual(MIN_RANKING_VOLUME);
    expect(total).toBeLessThan(MIN_DEVICE_INSIGHT_VOLUME);
    const thin = buildRanking([
      { label: 'iOS', scans: 25 },
      { label: 'Android', scans: 5 },
    ]);
    expect(thin.enoughData).toBe(true); // MIN_RANKING_VOLUME is cleared
    expect(deviceInsight(thin)).toBeNull(); // MIN_DEVICE_INSIGHT_VOLUME is not
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

/**
 * I2: pins the RANKING AXIS itself, not just each generator in isolation.
 *
 * Every other describe block above compares strengths WITHIN one family. None
 * compares ACROSS families — which is the entire point of `strength`, per
 * insights.ts's own doc comment. Without this, any anchor constant could be
 * changed to any value and the rest of the suite would stay green while a
 * different three sentences reached the sponsor.
 *
 * The six fixtures below are real inputs — real OverviewRows, a real
 * buildHeatmap/buildRanking/buildFunnel — chosen so the real generators
 * reproduce the spec's own six example sentences exactly:
 *   captation « 1 personne sur 4 », tendance « +38 % »,
 *   pic « samedi 23 h — 34 % », villes « Paris, Lyon, Marseille = 62 % »,
 *   appareil « 87 % … iOS », decrochage « 58 % ».
 */
describe('the ranking axis — a reference scenario built from the spec’s own six examples', () => {
  const current: OverviewRow = { bucket: 'current', scans: 1380, uniques: 400, leads: 100 };
  const previous: OverviewRow = { bucket: 'previous', scans: 1000, uniques: 300, leads: 60 };

  // Peak share 34 %: 34 of a 100-scan total lands on samedi 23 h. Three
  // 22-scan filler cells keep every OTHER cell below 34, so samedi 23 h stays
  // the busiest one rather than being outweighed by its own remainder.
  const heatmap = buildHeatmap([
    { dow: 6, hour: 23, scans: 34 },
    { dow: 2, hour: 12, scans: 22 },
    { dow: 3, hour: 10, scans: 22 },
    { dow: 4, hour: 15, scans: 22 },
  ]);

  // Top three (Paris, Lyon, Marseille) = 620 of 1 000 = 62 %. Five filler
  // cities of 76 each soak up the rest without outranking Marseille (100) or
  // creating an « Autres » row (8 rows, under MAX_RANKED_ROWS).
  const geo = buildRanking([
    { label: 'Paris', scans: 400 },
    { label: 'Lyon', scans: 120 },
    { label: 'Marseille', scans: 100 },
    { label: 'Ville3', scans: 76 },
    { label: 'Ville4', scans: 76 },
    { label: 'Ville5', scans: 76 },
    { label: 'Ville6', scans: 76 },
    { label: 'Ville7', scans: 76 },
  ]);

  // iOS = 870 of 1 000 = 87 %.
  const systems = buildRanking([
    { label: 'iOS', scans: 870 },
    { label: 'Android', scans: 130 },
  ]);

  // formulaire_vu (900) -> formulaire_soumis (378) is a 58 % drop, the worst
  // of the four candidate steps (scannes -> formulaire_vu is 10 %,
  // formulaire_soumis -> offre_atteinte is ~2 %; distribues -> scannes is
  // excluded from candidacy by buildFunnel itself).
  const funnel = buildFunnel(
    { distribues: 5000, scannes: 1000, formulaire_vu: 900, formulaire_soumis: 378, offre_atteinte: 370 },
    { distributionComplete: true },
  );

  const candidates = () => [
    captationInsight(current),
    trendInsight(current, previous, true),
    peakInsight(heatmap),
    citiesInsight(geo),
    deviceInsight(systems),
    dropoffInsight(funnel),
  ];

  it('reproduces the spec’s six example sentences from real aggregates, not synthetic Insight literals', () => {
    const [captation, tendance, pic, villes, appareil, decrochage] = candidates();
    expect(captation?.emphasis).toBe('1 personne sur 4');
    expect(tendance?.emphasis).toBe('+38 %');
    expect(pic?.emphasis).toBe('samedi 23 h');
    expect(villes?.emphasis).toBe('Paris, Lyon, Marseille');
    expect(appareil?.emphasis).toBe('87 %');
    expect(decrochage?.emphasis).toBe('58 %');
  });

  it('lets at most one of the six families saturate at 1.0 — a tied 1.0 is a ranking decided by FAMILY_ORDER, not by data', () => {
    const all = candidates().filter((c): c is Insight => c !== null);
    expect(all).toHaveLength(6);

    const saturated = all.filter((c) => c.strength === 1);
    expect(saturated.length).toBeLessThanOrEqual(1);
  });

  it('ranks the top three the calibrated axis produces', () => {
    const top3 = selectInsights(candidates()).map((c) => c.id);
    // captation: a 1-in-4 conversion is the product's own definition of "as
    // notable as it gets" — the one family this scenario deliberately keeps
    // saturated.
    // appareil: 87 % iOS sits closer to full OS dominance than tendance's
    // 38 % swing sits to a fully dramatic period-over-period move.
    // tendance: the 38 % swing edges out decrochage's 58 % drop-off, pic's
    // 34 % concentration and villes' 62 % — each closer to its OWN floor than
    // to its OWN ceiling.
    expect(top3).toEqual(['captation', 'appareil', 'tendance']);
  });

  it('scores captation, tendance, appareil, villes, decrochage and pic against their named anchor constants — the load-bearing use the imports were missing', () => {
    const rate = current.leads / current.uniques; // 0.25
    const captation = captationInsight(current)!;
    expect(captation.strength).toBeCloseTo(rate / CAPTATION_RATE_FOR_FULL_STRENGTH, 6);

    const delta = (current.scans - previous.scans) / previous.scans; // 0.38
    const tendance = trendInsight(current, previous, true)!;
    expect(tendance.strength).toBeCloseTo(delta / TREND_DELTA_FOR_FULL_STRENGTH, 6);

    const peakShare = heatmap.peak!.scans / heatmap.total; // 0.34
    const pic = peakInsight(heatmap)!;
    expect(pic.strength).toBeCloseTo(peakShare / PEAK_SHARE_FOR_FULL_STRENGTH, 6);

    const villesShare = 0.62;
    const villes = citiesInsight(geo)!;
    expect(villes.strength).toBeCloseTo(
      (villesShare - MIN_CITIES_SHARE) / (CITIES_SHARE_FOR_FULL_STRENGTH - MIN_CITIES_SHARE),
      6,
    );

    const appareilShare = 0.87;
    const appareil = deviceInsight(systems)!;
    expect(appareil.strength).toBeCloseTo(
      (appareilShare - MIN_DEVICE_SHARE) / (DEVICE_SHARE_FOR_FULL_STRENGTH - MIN_DEVICE_SHARE),
      6,
    );

    const dropRatio = 0.58;
    const decrochage = dropoffInsight(funnel)!;
    expect(decrochage.strength).toBeCloseTo(dropRatio / DROPOFF_RATIO_FOR_FULL_STRENGTH, 6);
  });
});
