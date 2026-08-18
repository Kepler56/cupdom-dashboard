import { describe, expect, it } from 'vitest';
import { parsePeriod, resolvePeriod, PERIOD_PRESETS } from '@/lib/period';

const NOW = new Date('2026-08-18T12:00:00Z');
const DAY = 86_400_000;

describe('parsePeriod', () => {
  it('defaults to 30j when the URL parameter is missing', () => {
    expect(parsePeriod(undefined)).toBe('30j');
  });

  it('defaults to 30j when the URL parameter is junk', () => {
    expect(parsePeriod('bogus')).toBe('30j');
    expect(parsePeriod('')).toBe('30j');
  });

  it('accepts every documented preset', () => {
    for (const p of PERIOD_PRESETS) {
      expect(parsePeriod(p.id)).toBe(p.id);
    }
  });
});

describe('resolvePeriod', () => {
  it('spans exactly 7 days ending now for 7j', () => {
    const r = resolvePeriod('7j', NOW);
    expect(r.to.getTime()).toBe(NOW.getTime());
    expect(r.from.getTime()).toBe(NOW.getTime() - 7 * DAY);
  });

  it('makes the previous window the SAME LENGTH and immediately prior', () => {
    // A trend compared against a different-length window is meaningless.
    const r = resolvePeriod('30j', NOW);
    expect(r.prevTo.getTime()).toBe(r.from.getTime());
    expect(r.prevFrom.getTime()).toBe(r.from.getTime() - 30 * DAY);
    expect(r.to.getTime() - r.from.getTime()).toBe(r.prevTo.getTime() - r.prevFrom.getTime());
    expect(r.hasPrevious).toBe(true);
  });

  it('handles 90j', () => {
    const r = resolvePeriod('90j', NOW);
    expect(r.from.getTime()).toBe(NOW.getTime() - 90 * DAY);
    expect(r.prevFrom.getTime()).toBe(NOW.getTime() - 180 * DAY);
  });

  it('reports NO previous window for "tout" — there is nothing to compare against', () => {
    // Showing a trend for all-time would compare against the void and read as
    // an infinite increase. hasPrevious=false means the UI hides the trend.
    const r = resolvePeriod('tout', NOW);
    expect(r.hasPrevious).toBe(false);
    expect(r.from.getTime()).toBe(0);
    expect(r.to.getTime()).toBe(NOW.getTime());
  });

  it('never returns a window where from is after to', () => {
    for (const p of PERIOD_PRESETS) {
      const r = resolvePeriod(p.id, NOW);
      expect(r.from.getTime()).toBeLessThanOrEqual(r.to.getTime());
      expect(r.prevFrom.getTime()).toBeLessThanOrEqual(r.prevTo.getTime());
    }
  });
});
