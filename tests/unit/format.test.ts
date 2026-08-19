import { describe, expect, it } from 'vitest';
import {
  formatDayLong,
  formatDayShort,
  formatEuros,
  formatNumber,
  formatPercent,
  formatPoints,
  formatRate,
  formatSignedPercent,
} from '@/lib/analytics/format';

// The separators are asserted as explicit code points on purpose. fr-FR uses a
// NARROW no-break space (U+202F) between thousands but a REGULAR no-break space
// (U+00A0) before % and €. A plain ASCII space looks identical in a diff and is
// wrong. Verified against Node 24 full-ICU, which is what renders in production.
const NNBSP = '\u202F';
const NBSP = '\u00A0';

describe('formatNumber', () => {
  it('groups thousands with a narrow no-break space', () => {
    expect(formatNumber(12345)).toBe(`12${NNBSP}345`);
  });

  it('leaves small numbers alone', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('rounds to a whole number — a fractional scan count is meaningless', () => {
    expect(formatNumber(1234.6)).toBe(`1${NNBSP}235`);
  });
});

describe('formatPercent', () => {
  it('renders whole percents with a no-break space before the sign', () => {
    expect(formatPercent(0.38)).toBe(`38${NBSP}%`);
  });

  it('honours a decimal count', () => {
    expect(formatPercent(0.384, 1)).toBe(`38,4${NBSP}%`);
  });
});

describe('formatRate', () => {
  it('renders a rate as a percentage', () => {
    expect(formatRate(200, 800)).toBe(`25${NBSP}%`);
  });

  // The whole reason this helper exists. "0 %" over an empty denominator states
  // a captation rate for a campaign nobody has reached yet — a claim, not a
  // measurement. Both the KPI tile and the campaigns table depend on this.
  it('renders an em dash, not 0 %, when the denominator is zero', () => {
    expect(formatRate(0, 0)).toBe('—');
  });

  it('renders an em dash for a negative denominator too', () => {
    expect(formatRate(5, -1)).toBe('—');
  });

  it('does not confuse a zero NUMERATOR with a missing denominator', () => {
    expect(formatRate(0, 800)).toBe(`0${NBSP}%`);
  });
});

describe('formatSignedPercent', () => {
  it('shows an explicit plus on growth', () => {
    expect(formatSignedPercent(0.38)).toBe(`+38${NBSP}%`);
  });

  it('shows a minus on decline', () => {
    expect(formatSignedPercent(-0.12)).toBe(`-12${NBSP}%`);
  });

  it('shows no sign at exactly zero', () => {
    expect(formatSignedPercent(0)).toBe(`0${NBSP}%`);
  });
});

describe('formatPoints', () => {
  it('renders a rate delta in points, always signed', () => {
    expect(formatPoints(0.04)).toBe(`+4${NBSP}pts`);
  });

  it('renders a negative delta', () => {
    expect(formatPoints(-0.04)).toBe(`-4${NBSP}pts`);
  });
});

describe('formatEuros', () => {
  it('renders euros with two decimals in the French order', () => {
    expect(formatEuros(2.4)).toBe(`2,40${NBSP}€`);
  });
});

describe('formatDayShort / formatDayLong', () => {
  it('renders a Paris calendar date without a year', () => {
    expect(formatDayShort('2026-08-19')).toBe('19 août');
  });

  // The date string is already a Paris calendar date. Formatting it in the
  // server's local zone would shift it backwards a day on any host west of
  // Greenwich, so the formatter is pinned to UTC.
  it('does not drift a day when the host is not in Paris', () => {
    expect(formatDayShort('2026-01-01')).toBe('1 janv.');
  });

  it('renders the long form with a year', () => {
    expect(formatDayLong('2026-08-19')).toBe('19 août 2026');
  });
});
