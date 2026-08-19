import { describe, expect, it } from 'vitest';
import { buildRanking, MAX_RANKED_ROWS, UNKNOWN_LABEL } from '@/lib/analytics/ranking';

const row = (label: string, scans: number, uniques?: number) => ({ label, scans, uniques });

describe('buildRanking', () => {
  it('computes each row share against the total', () => {
    const r = buildRanking([row('Paris', 60), row('Lyon', 40)]);
    expect(r.total).toBe(100);
    expect(r.rows[0].share).toBeCloseTo(0.6);
    expect(r.rows[0].shareLabel).toBe('60\u00A0%');
  });

  it('formats counts in fr-FR', () => {
    expect(buildRanking([row('Paris', 1200)]).rows[0].scansLabel).toBe('1\u202F200');
  });

  it('sorts by scans descending even when the input is not sorted', () => {
    const r = buildRanking([row('Lyon', 40), row('Paris', 60)]);
    expect(r.rows.map((x) => x.label)).toEqual(['Paris', 'Lyon']);
  });

  it('carries uniques when present and nulls it when absent', () => {
    const withU = buildRanking([row('Paris', 60, 45)]).rows[0];
    expect(withU.uniques).toBe(45);
    expect(withU.uniquesLabel).toBe('45');

    const withoutU = buildRanking([row('Paris', 60)]).rows[0];
    expect(withoutU.uniques).toBeNull();
    expect(withoutU.uniquesLabel).toBeNull();
  });

  // A silently truncated list reads as "that's all there was". Rolling the tail
  // into a labelled row keeps the shares summing to 100 % and admits the cut.
  it('rolls everything past the limit into a single « Autres » row', () => {
    const many = Array.from({ length: 15 }, (_, i) => row(`V${i}`, 100 - i));
    const r = buildRanking(many, 5);
    expect(r.rows).toHaveLength(6);
    expect(r.rows[5].label).toBe('Autres');
    expect(r.rows[5].isOther).toBe(true);
    const summed = r.rows.reduce((s, x) => s + x.scans, 0);
    expect(summed).toBe(r.total);
  });

  it('does not add an « Autres » row when nothing was cut', () => {
    const r = buildRanking([row('Paris', 60), row('Lyon', 40)], 5);
    expect(r.rows.some((x) => x.isOther)).toBe(false);
  });

  it('sums uniques into the « Autres » row as an approximation, flagged as such', () => {
    const many = Array.from({ length: 8 }, (_, i) => row(`V${i}`, 10, 5));
    const r = buildRanking(many, 3);
    // Summing distinct counts overstates: the same person can appear in two
    // buckets. The row exists so the shares add up; its uniques is a ceiling.
    expect(r.rows[3].uniques).toBe(25);
  });

  it('is empty for no rows', () => {
    const r = buildRanking([]);
    expect(r.rows).toEqual([]);
    expect(r.total).toBe(0);
    expect(r.empty).toBe(true);
  });

  // A venue ranking where no campaign carries a venue is every row 'Inconnu'.
  // That dimension carries no information and the section must not render.
  it('is empty when every row is the unknown bucket', () => {
    expect(buildRanking([row(UNKNOWN_LABEL, 500)]).empty).toBe(true);
  });

  it('is not empty when an unknown bucket sits beside a real one', () => {
    expect(buildRanking([row('Paris', 500), row(UNKNOWN_LABEL, 10)]).empty).toBe(false);
  });

  it('flags a ranking whose whole base is too thin to read as percentages', () => {
    expect(buildRanking([row('Paris', 6), row('Lyon', 4)]).enoughData).toBe(false);
    expect(buildRanking([row('Paris', 600), row('Lyon', 400)]).enoughData).toBe(true);
  });

  it('does not divide by zero when every count is zero', () => {
    const r = buildRanking([row('Paris', 0)]);
    expect(r.rows[0].share).toBe(0);
    expect(r.rows[0].shareLabel).toBe('0\u00A0%');
  });

  it('defaults its limit to MAX_RANKED_ROWS', () => {
    const many = Array.from({ length: MAX_RANKED_ROWS + 3 }, (_, i) => row(`V${i}`, 10));
    expect(buildRanking(many).rows).toHaveLength(MAX_RANKED_ROWS + 1);
  });
});
