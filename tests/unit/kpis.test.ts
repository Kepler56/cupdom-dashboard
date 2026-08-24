import { describe, expect, it } from 'vitest';
import { buildKpis, computeRateTrend, computeTrend, trendNote } from '@/lib/analytics/kpis';
import type { SeriesPoint } from '@/lib/analytics/series';
import type { OverviewRow } from '@/lib/analytics/types';

const overview = (bucket: 'current' | 'previous', scans: number, uniques: number, leads: number): OverviewRow => ({
  bucket,
  scans,
  uniques,
  leads,
});

// The *Label fields exist for the chart's tooltip; buildKpis reads only the
// numeric columns, so they are filled with String() rather than the real
// formatter to keep this fixture free of fr-FR separators it never asserts on.
const point = (day: string, scans: number, uniques: number, leads: number): SeriesPoint => ({
  day,
  label: day,
  scans,
  uniques,
  leads,
  scansLabel: String(scans),
  uniquesLabel: String(uniques),
  leadsLabel: String(leads),
});

describe('computeTrend', () => {
  it('reports growth', () => {
    expect(computeTrend(138, 100, true)).toMatchObject({ kind: 'up', unit: 'percent' });
    expect(computeTrend(138, 100, true).value).toBeCloseTo(0.38);
  });

  it('reports decline', () => {
    expect(computeTrend(50, 100, true).kind).toBe('down');
  });

  it('reports flat inside the noise band', () => {
    expect(computeTrend(1000, 1002, true).kind).toBe('flat');
  });

  it('reports nothing when there is no comparable previous window', () => {
    expect(computeTrend(500, 0, false)).toMatchObject({ kind: 'none', value: null });
  });

  // Spec §4.6-3: no flat line dressed up as a trend. 1 → 3 scans is "+200 %".
  it('reports nothing when the previous window is below the volume floor', () => {
    expect(computeTrend(3, 1, true).kind).toBe('none');
  });

  // The floor is on the DENOMINATOR only — a collapse from a real base is real
  // information and must still be shown.
  it('still reports a collapse from a large base', () => {
    expect(computeTrend(3, 200, true).kind).toBe('down');
  });
});

describe('computeRateTrend', () => {
  it('expresses a rate change in points, not as a percentage of a percentage', () => {
    const trend = computeRateTrend({ part: 25, whole: 100 }, { part: 20, whole: 100 }, true);
    expect(trend.unit).toBe('points');
    expect(trend.value).toBeCloseTo(0.05);
    expect(trend.kind).toBe('up');
  });

  it('reports nothing when either denominator is too small to mean anything', () => {
    expect(computeRateTrend({ part: 1, whole: 2 }, { part: 20, whole: 100 }, true).kind).toBe('none');
    expect(computeRateTrend({ part: 20, whole: 100 }, { part: 1, whole: 2 }, true).kind).toBe('none');
  });
});

describe('buildKpis', () => {
  const base = {
    current: overview('current', 1000, 800, 200),
    previous: overview('previous', 500, 400, 50),
    hasPrevious: true,
    series: [point('2026-08-18', 400, 300, 80), point('2026-08-19', 600, 500, 120)],
  };

  it('returns the four tiles, in the spec order, and nothing else', () => {
    expect(buildKpis(base).map((k) => k.id)).toEqual(['touchees', 'scans', 'contacts', 'captation']);
  });

  it('formats every value in fr-FR', () => {
    const kpis = buildKpis(base);
    expect(kpis[1].value).toBe('1\u202F000');
    expect(kpis[3].value).toBe('25\u00A0%');
  });

  it('renders an em dash rather than 0 % when nobody has been reached', () => {
    const kpis = buildKpis({ ...base, current: overview('current', 0, 0, 0) });
    expect(kpis[3].value).toBe('—');
  });

  it('carries the daily values as sparklines for the count tiles only', () => {
    const kpis = buildKpis(base);
    expect(kpis[0].sparkline).toEqual([300, 500]);
    expect(kpis[1].sparkline).toEqual([400, 600]);
    expect(kpis[2].sparkline).toEqual([80, 120]);
    // A daily rate over small denominators is noise, not a trend line.
    expect(kpis[3].sparkline).toEqual([]);
  });

  it('drops every trend when the period has no comparable predecessor', () => {
    const kpis = buildKpis({ ...base, hasPrevious: false });
    expect(kpis.every((k) => k.trendLabel === null)).toBe(true);
  });

  it('defines "personnes touchées" in its hint — the daily-uniqueness caveat', () => {
    expect(buildKpis(base)[0].hint).toContain('unique par jour');
  });
});

describe('trendNote', () => {
  const withTrend = (kind: 'up' | 'none') =>
    ({ id: 'scans', label: 'Scans totaux', value: '1', hint: '', trend: { kind, value: kind === 'up' ? 0.1 : null, unit: 'percent' as const }, trendLabel: null, sparkline: [] });

  it('is silent while at least one tile still shows a trend', () => {
    expect(trendNote([withTrend('up'), withTrend('none')] as never, true)).toBeNull();
  });

  // Spec §4.6-3: suppressing every badge is right, doing it silently is not —
  // it reads as a broken dashboard, which is the failure the rule prevents.
  it('explains an empty comparison window when the period has one', () => {
    expect(trendNote([withTrend('none')] as never, true)).toMatch(/période précédente/);
  });

  it('says something different for « Tout », which has no previous window at all', () => {
    expect(trendNote([withTrend('none')] as never, false)).toMatch(/Tout/);
  });

  it('is silent when there are no tiles at all', () => {
    expect(trendNote([], true)).toBeNull();
  });
});
