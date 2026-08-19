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
});
