import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WeekdayBars } from '@/components/charts/WeekdayBars';
import { weekdayTotals } from '@/lib/analytics/heatmap';

describe('WeekdayBars', () => {
  const totals = weekdayTotals([
    { dow: 6, hour: 23, scans: 40 },
    { dow: 5, hour: 22, scans: 30 },
    { dow: 1, hour: 12, scans: 10 },
  ]);

  it('renders all seven days, quiet ones included', () => {
    render(<WeekdayBars totals={totals} />);
    expect(screen.getByText('mercredi')).toBeInTheDocument();
  });

  it('shows the count and the share for each day', () => {
    render(<WeekdayBars totals={totals} />);
    expect(screen.getByText('40', { collapseWhitespace: false })).toBeInTheDocument();
    expect(screen.getByText('50 %', { collapseWhitespace: false })).toBeInTheDocument();
  });

  it('does not crash on a week with no scans at all', () => {
    render(<WeekdayBars totals={weekdayTotals([])} />);
    expect(screen.getAllByText('0 %', { collapseWhitespace: false })).toHaveLength(7);
  });
});
