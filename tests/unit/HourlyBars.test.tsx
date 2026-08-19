import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HourlyBars } from '@/components/charts/HourlyBars';
import { hourlyTotals } from '@/lib/analytics/heatmap';

describe('HourlyBars', () => {
  const totals = hourlyTotals([
    { dow: 6, hour: 23, scans: 40 },
    { dow: 5, hour: 23, scans: 20 },
    { dow: 2, hour: 12, scans: 10 },
  ]);

  it('draws all 24 hours, the quiet ones included', () => {
    render(<HourlyBars totals={totals} />);
    expect(screen.getAllByRole('img')).toHaveLength(24);
  });

  // Queried BY ROLE on purpose. An `aria-label` on a role-less <div> lands on
  // the implicit `generic` role, which ARIA 1.2 forbids from being named, so
  // assistive tech drops it and all 24 values announce as nothing. An assertion
  // on the attribute alone would have passed against exactly that markup.
  it('gives every bar an accessible name carrying its hour and its count', () => {
    render(<HourlyBars totals={totals} />);
    expect(screen.getByRole('img', { name: '23 h — 60 scans' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '12 h — 10 scans' })).toBeInTheDocument();
  });

  // The companion charts are the WCAG 1.4.1 escape hatch: the heatmap's data
  // with no hue at all. A quiet hour that announces nothing is a hole in it.
  it('names the empty hours too', () => {
    render(<HourlyBars totals={totals} />);
    expect(screen.getByRole('img', { name: '4 h — 0 scans' })).toBeInTheDocument();
  });

  it('scales the busiest hour to the full height of the track', () => {
    const { container } = render(<HourlyBars totals={totals} />);
    const heights = [...container.querySelectorAll('[role="img"]')].map((el) =>
      parseFloat((el as HTMLElement).style.height),
    );
    expect(Math.max(...heights)).toBe(100);
  });
});
