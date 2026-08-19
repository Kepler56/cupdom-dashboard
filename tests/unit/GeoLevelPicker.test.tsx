import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GeoLevelPicker } from '@/components/molecules/GeoLevelPicker';

// No router mock: the picker navigates with <Link>, so there is no push() to
// observe. Mocking one — and importing userEvent — advertised interaction
// coverage this file does not have.
vi.mock('next/navigation', () => ({
  usePathname: () => '/audience',
  useSearchParams: () => new URLSearchParams('p=7j&c=nike-ete'),
}));

describe('GeoLevelPicker', () => {
  it('offers the levels it is given, in order', () => {
    render(<GeoLevelPicker levels={[{ id: 'country', label: 'Pays' }, { id: 'city', label: 'Villes' }]} current="city" />);
    expect(screen.getByRole('link', { name: 'Pays' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Villes' })).toBeInTheDocument();
  });

  it('marks the current level', () => {
    render(<GeoLevelPicker levels={[{ id: 'country', label: 'Pays' }, { id: 'city', label: 'Villes' }]} current="city" />);
    expect(screen.getByRole('link', { name: 'Villes' })).toHaveAttribute('aria-current', 'true');
  });

  // Changing the geography cut must not silently reset the period or the
  // campaign the client chose.
  it('preserves the other URL parameters', () => {
    render(<GeoLevelPicker levels={[{ id: 'country', label: 'Pays' }, { id: 'city', label: 'Villes' }]} current="city" />);
    const href = screen.getByRole('link', { name: 'Pays' }).getAttribute('href') ?? '';
    expect(href).toContain('p=7j');
    expect(href).toContain('c=nike-ete');
    expect(href).toContain('geo=country');
  });
});
