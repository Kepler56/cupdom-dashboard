import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ScansArea } from '@/components/charts/ScansArea';
import type { SeriesPoint } from '@/lib/analytics/series';

const series: SeriesPoint[] = [
  { day: '2026-08-18', label: '18 août', scans: 40, uniques: 30, leads: 8 },
  { day: '2026-08-19', label: '19 août', scans: 60, uniques: 50, leads: 12 },
];

describe('ScansArea', () => {
  it('offers the three metrics as a toggle', () => {
    render(<ScansArea series={series} />);
    expect(screen.getByRole('button', { name: 'Scans' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Personnes touchées' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contacts' })).toBeInTheDocument();
  });

  it('starts on scans', () => {
    render(<ScansArea series={series} />);
    expect(screen.getByRole('button', { name: 'Scans' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches metric on click', async () => {
    render(<ScansArea series={series} />);
    await userEvent.click(screen.getByRole('button', { name: 'Contacts' }));
    expect(screen.getByRole('button', { name: 'Contacts' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Scans' })).toHaveAttribute('aria-pressed', 'false');
  });
});
