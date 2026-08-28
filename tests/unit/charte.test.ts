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
    expect(CHARTE.textMuted).toBe('#6A665C');
  });

  /**
   * TRA-A04: textMuted shipped at #8A8478 — 3,72:1 on white, 3,24:1 on cream —
   * while carrying nearly all of the portal's secondary text. Ratios are asserted
   * rather than the hex alone, so lightening the token back below AA fails here
   * instead of in an audit months later.
   */
  it('keeps secondary text readable on both grounds', () => {
    const luminance = (hex: string) => {
      const channels = [1, 3, 5]
        .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const contrast = (a: string, b: string) => {
      const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (light + 0.05) / (dark + 0.05);
    };

    for (const ground of [CHARTE.blanc, CHARTE.creme]) {
      expect(contrast(CHARTE.textMuted, ground)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(CHARTE.textBody, ground)).toBeGreaterThanOrEqual(4.5);
    }
    // Muted must stay visibly lighter than body, or the hierarchy collapses.
    expect(contrast(CHARTE.textMuted, CHARTE.blanc)).toBeLessThan(
      contrast(CHARTE.textBody, CHARTE.blanc),
    );
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
