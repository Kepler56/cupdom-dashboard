import { describe, expect, it } from 'vitest';
import { groupCampaignSeries, toSparklines } from '@/lib/analytics/campaignSeries';
import type { CampaignDailyRow } from '@/lib/analytics/types';

const to = new Date('2026-08-10T12:00:00Z'); // 14:00 Paris — 2026-08-10

const rows: CampaignDailyRow[] = [
  { slug: 'rex', day: '2026-08-08', scans: 10 },
  { slug: 'rex', day: '2026-08-10', scans: 30 },
  { slug: 'bada', day: '2026-08-09', scans: 5 },
];

describe('groupCampaignSeries', () => {
  it('materialises missing days at zero', () => {
    const out = groupCampaignSeries({ rows, slugs: ['rex'], from: new Date('2026-08-08T12:00:00Z'), to });
    expect(out.rex).toEqual([10, 0, 30]);
  });

  it('gives every campaign the SAME window, so two rows are comparable', () => {
    const out = groupCampaignSeries({ rows, slugs: ['rex', 'bada'], from: new Date('2026-08-08T12:00:00Z'), to });
    expect(out.rex).toHaveLength(3);
    expect(out.bada).toHaveLength(3);
    expect(out.bada).toEqual([0, 5, 0]);
  });

  it('gives a campaign with no rows at all a full-length zero series', () => {
    const out = groupCampaignSeries({ rows, slugs: ['rex', 'silencieuse'], from: new Date('2026-08-08T12:00:00Z'), to });
    expect(out.silencieuse).toEqual([0, 0, 0]);
  });

  it('starts at the earliest day ACROSS ALL campaigns when from is null', () => {
    // 'bada' has nothing on the 8th, but the window still opens there because
    // 'rex' does. Per-campaign windows would make the two incomparable.
    const out = groupCampaignSeries({ rows, slugs: ['rex', 'bada'], from: null, to });
    expect(out.rex).toEqual([10, 0, 30]);
    expect(out.bada).toEqual([0, 5, 0]);
  });

  it('returns empty series when there is nothing to draw', () => {
    const out = groupCampaignSeries({ rows: [], slugs: ['rex'], from: null, to });
    expect(out.rex).toEqual([]);
  });

  it('falls back to the first day with data when the window is absurdly long', () => {
    // resolvePeriod('tout') hands us the epoch. Enumerating 20 000 empty days
    // into a 96 px sparkline is a caller mistake, not a chart.
    const out = groupCampaignSeries({ rows, slugs: ['rex'], from: new Date(0), to });
    expect(out.rex).toEqual([10, 0, 30]);
  });

  it('buckets the end of the window on the PARIS day', () => {
    // 2026-08-10T23:00Z is 01:00 Paris on the 11th, so the 11th is included.
    const out = groupCampaignSeries({
      rows,
      slugs: ['rex'],
      from: new Date('2026-08-08T12:00:00Z'),
      to: new Date('2026-08-10T23:00:00Z'),
    });
    expect(out.rex).toEqual([10, 0, 30, 0]);
  });
});

describe('toSparklines', () => {
  it('captions the curve with its own total, which the row does not otherwise show', () => {
    const out = toSparklines({ rex: [10, 0, 30] });
    // The row's Scans column is a LIFETIME total; this is the period total.
    // U+202F between thousands, so no space is typed literally here.
    expect(out.rex.total).toBe(40);
    expect(out.rex.caption).toBe(`${out.rex.totalLabel} scans sur la période sélectionnée.`);
  });

  it('says « pas encore de scans » only when the total really is zero', () => {
    expect(toSparklines({ rex: [] }).rex.caption).toBe('Pas encore de scans sur la période sélectionnée.');
    // A full window of zeros is the other way to have nothing: the curve is
    // drawable (it is a flat line) but there is nothing to count.
    const flat = toSparklines({ rex: [0, 0, 0] }).rex;
    expect(flat.total).toBe(0);
    expect(flat.caption).toBe('Pas encore de scans sur la période sélectionnée.');
  });

  it('does not call a period with scans empty just because it is one day long', () => {
    // One day IS the whole window under ?p=7j on launch day, and under « Tout »
    // too — seriesWindow opens at the client's earliest data day. Sparkline
    // renders nothing (a lone dot reads as a bug), but the caption must still
    // carry the number, because that number is real. Announcing « Pas encore de
    // scans » over 42 real scans is the defect this asserts against.
    const out = toSparklines({ rex: [42] });
    expect(out.rex.total).toBe(42);
    expect(out.rex.caption).toBe(
      '42 scans sur la période sélectionnée (un seul jour — pas assez pour tracer une courbe).',
    );
    expect(out.rex.caption).not.toContain('Pas encore de scans');
  });

  it('explains the absent curve for a one-day window without hiding the figure', () => {
    const out = toSparklines({ rex: [7] });
    expect(out.rex.caption).toContain('7 scans sur la période sélectionnée');
    expect(out.rex.caption).toContain('un seul jour');
  });
});
