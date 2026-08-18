import { describe, expect, it } from 'vitest';
import { CHARTE, CHART_SERIES, HEATMAP_RAMP } from '@/lib/charte';

describe('charte graphique', () => {
  it('exposes the exact charte hex values', () => {
    expect(CHARTE.creme).toBe('#F4EFE3');
    expect(CHARTE.blanc).toBe('#FFFFFF');
    expect(CHARTE.encre).toBe('#111110');
    expect(CHARTE.jaune).toBe('#FCC917');
    expect(CHARTE.bleu).toBe('#003082');
    expect(CHARTE.rose).toBe('#FF0099');
    expect(CHARTE.orange).toBe('#F56600');
    expect(CHARTE.border).toBe('#E7E0D0');
    expect(CHARTE.textBody).toBe('#4A4741');
    expect(CHARTE.textMuted).toBe('#8A8478');
  });

  it('orders chart series so jaune and orange are never adjacent', () => {
    expect(CHART_SERIES).toEqual([
      CHARTE.jaune,
      CHARTE.bleu,
      CHARTE.encre,
      CHARTE.rose,
      CHARTE.orange,
    ]);
    const jauneIdx = CHART_SERIES.indexOf(CHARTE.jaune);
    const orangeIdx = CHART_SERIES.indexOf(CHARTE.orange);
    expect(Math.abs(jauneIdx - orangeIdx)).toBeGreaterThan(1);
  });

  it('ramps the heatmap from crème through jaune and orange to encre', () => {
    expect(HEATMAP_RAMP).toEqual([CHARTE.creme, CHARTE.jaune, CHARTE.orange, CHARTE.encre]);
  });

  it('is frozen so a caller cannot mutate the brand at runtime', () => {
    expect(Object.isFrozen(CHARTE)).toBe(true);
  });
});
