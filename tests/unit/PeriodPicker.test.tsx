import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PeriodPicker } from '@/components/molecules/PeriodPicker';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams('c=abc'),
}));

describe('PeriodPicker', () => {
  it('offers every preset with its French label', () => {
    render(<PeriodPicker current="30j" />);
    for (const label of ['7 jours', '30 jours', '90 jours', 'Tout']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('marks the current preset as pressed', () => {
    render(<PeriodPicker current="30j" />);
    expect(screen.getByRole('link', { name: '30 jours' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('link', { name: '7 jours' })).not.toHaveAttribute('aria-current');
  });

  it('preserves other query parameters when switching period', () => {
    // The campaign filter must survive a period change, or the user silently
    // loses their scope.
    render(<PeriodPicker current="30j" />);
    expect(screen.getByRole('link', { name: '7 jours' })).toHaveAttribute('href', '/?c=abc&p=7j');
  });
});
