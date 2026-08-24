import { describe, expect, it } from 'vitest';
import { buildFunnel } from '@/lib/analytics/funnel';
import type { FunnelRow } from '@/lib/analytics/types';

const funnel = (over: Partial<FunnelRow> = {}): FunnelRow => ({
  distribues: 500,
  scannes: 200,
  formulaire_vu: 120,
  formulaire_soumis: 50,
  offre_atteinte: 40,
  ...over,
});

describe('buildFunnel', () => {
  it('renders the five stages in order with French labels', () => {
    const view = buildFunnel(funnel());
    expect(view.stages.map((s) => s.id)).toEqual([
      'distribues',
      'scannes',
      'formulaire_vu',
      'formulaire_soumis',
      'offre_atteinte',
    ]);
    expect(view.stages[3].label).toBe('Formulaire envoyé');
  });

  it('computes each share against the first stage', () => {
    const view = buildFunnel(funnel());
    expect(view.stages[0].share).toBe(1);
    expect(view.stages[1].share).toBeCloseTo(0.4);
  });

  it('computes the loss from the preceding stage', () => {
    const view = buildFunnel(funnel());
    expect(view.stages[0].drop).toBeNull();
    expect(view.stages[1].drop).toBeCloseTo(0.6);
    expect(view.stages[1].dropLabel).toBe('60\u00A0%');
  });

  // An unset distributed_count is a MISSING INPUT, not "zero covers handed out".
  // Rendering it as 0 would put a false number in front of the client.
  it('drops the Distribués stage when no count has been entered', () => {
    const view = buildFunnel(funnel({ distribues: 0 }));
    expect(view.distributionUnknown).toBe(true);
    expect(view.stages.map((s) => s.id)).toEqual([
      'scannes',
      'formulaire_vu',
      'formulaire_soumis',
      'offre_atteinte',
    ]);
  });

  it('measures from Scannés once Distribués is gone', () => {
    const view = buildFunnel(funnel({ distribues: 0 }));
    expect(view.stages[0].share).toBe(1);
    expect(view.stages[1].share).toBeCloseTo(0.6);
  });

  // The three funnel_events kinds are independent: a visitor can reach the offer
  // without submitting the form, so a later stage may legitimately exceed an
  // earlier one. A negative loss is never rendered.
  it('never renders a negative loss on a non-monotonic funnel', () => {
    const view = buildFunnel(funnel({ formulaire_soumis: 50, offre_atteinte: 90 }));
    expect(view.stages[4].drop).toBe(0);
  });

  it('clamps a share to 1 so no bar overflows its track', () => {
    const view = buildFunnel(funnel({ distribues: 10, scannes: 200 }));
    expect(view.stages[1].share).toBe(1);
  });

  it('names the biggest drop-off in a French sentence', () => {
    const view = buildFunnel(funnel());
    expect(view.worstDrop?.id).toBe('formulaire_soumis');
    expect(view.worstDrop?.sentence).toContain('Votre plus gros décrochage');
    expect(view.worstDrop?.sentence).toContain('58\u00A0%');
  });

  it('names nothing below the volume floor — that would be storytelling', () => {
    const view = buildFunnel({
      distribues: 10,
      scannes: 4,
      formulaire_vu: 2,
      formulaire_soumis: 1,
      offre_atteinte: 1,
    });
    expect(view.worstDrop).toBeNull();
  });

  // The distribués -> scannés step is structural and would otherwise win every
  // time. Excluding it is what lets the form - the biggest ACTIONABLE loss - be
  // the sentence the client reads.
  it('never names the distribués to scannés step, however large it is', () => {
    const view = buildFunnel(funnel({ distribues: 10000, scannes: 200 }));
    expect(view.worstDrop?.id).not.toBe('scannes');
    expect(view.worstDrop?.id).toBe('formulaire_soumis');
  });

  it('names nothing when nobody drops off', () => {
    const view = buildFunnel(funnel({ scannes: 500, formulaire_vu: 500, formulaire_soumis: 500, offre_atteinte: 500 }));
    expect(view.worstDrop).toBeNull();
  });

  it('survives an all-zero funnel without dividing by zero', () => {
    const view = buildFunnel(funnel({ distribues: 0, scannes: 0, formulaire_vu: 0, formulaire_soumis: 0, offre_atteinte: 0 }));
    expect(view.stages.every((s) => s.share === 0)).toBe(true);
    expect(view.worstDrop).toBeNull();
  });

  // C2. client_funnel sums coalesce(distributed_count, 0) over every campaign in
  // scope, so campaign A (500 distributed, 200 scans) + campaign B (no count,
  // 5 000 scans) arrives here as 500 distribués against 5 200 scannés. Treating
  // that partial total as a real denominator measures every share against a
  // number wrong in the FLATTERING direction, and renders visibly broken: the
  // share clamps to 1 and « 0 % de perte à cette étape » prints between 500 and
  // 5 200. All-or-nothing.
  it('treats a PARTIAL distributed_count as unknown, not as a denominator', () => {
    const view = buildFunnel(
      { distribues: 500, scannes: 5200, formulaire_vu: 3000, formulaire_soumis: 1000, offre_atteinte: 800 },
      { distributionComplete: false },
    );
    expect(view.distributionUnknown).toBe(true);
    expect(view.stages.map((s) => s.id)).toEqual([
      'scannes',
      'formulaire_vu',
      'formulaire_soumis',
      'offre_atteinte',
    ]);
    // Measured from scannés, not from the half-filled 500.
    expect(view.stages[0].share).toBe(1);
    expect(view.stages[1].share).toBeCloseTo(3000 / 5200);
  });

  it('keeps the historical meaning when the option is absent', () => {
    expect(buildFunnel(funnel()).distributionUnknown).toBe(false);
    expect(buildFunnel(funnel(), {}).distributionUnknown).toBe(false);
    expect(buildFunnel(funnel(), { distributionComplete: true }).distributionUnknown).toBe(false);
  });

  // I1. The volume floor must guard the denominator the drop is COMPUTED over,
  // not the head of the funnel. A large print run whose scans have barely
  // started — week one, which is when a sponsor first logs in — otherwise clears
  // the guard on 500 distribués and generates « votre plus gros décrochage :
  // formulaire envoyé — 100 % » out of a single person. Head volume and step
  // volume are deliberately separated here; the older fixtures set both low.
  it('does not name a drop computed over a handful of people, however large the print run', () => {
    const view = buildFunnel({
      distribues: 500,
      scannes: 3,
      formulaire_vu: 1,
      formulaire_soumis: 0,
      offre_atteinte: 0,
    });
    expect(view.worstDrop).toBeNull();
  });

  // The mirror of the case above: the same head volume, a step base that clears
  // the floor, and the sentence is generated as it should be.
  it('still names a drop once the step it is measured over clears the floor', () => {
    const view = buildFunnel({
      distribues: 500,
      scannes: 100,
      formulaire_vu: 80,
      formulaire_soumis: 8,
      offre_atteinte: 8,
    });
    expect(view.worstDrop?.id).toBe('formulaire_soumis');
    expect(view.worstDrop?.dropLabel).toBe('90\u00A0%');
  });
});
