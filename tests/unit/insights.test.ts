import { describe, expect, it } from 'vitest';
import { MAX_INSIGHTS, selectInsights, type Insight } from '@/lib/analytics/insights';

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
