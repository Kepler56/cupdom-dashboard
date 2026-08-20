import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SortableHeader } from '@/components/molecules/SortableHeader';
import { parseLeadsQuery } from '@/lib/analytics/leadsQuery';

vi.mock('next/navigation', () => ({
  usePathname: () => '/contacts',
  useSearchParams: () => new URLSearchParams('c=demo-rex-club&page=7&tri=date.desc'),
}));

describe('SortableHeader', () => {
  it('sorts a new column ascending on first click', () => {
    render(<SortableHeader label="Nom" sort="nom" query={parseLeadsQuery({ tri: 'date.desc' })} />);
    expect(screen.getByRole('link', { name: /Nom/ })).toHaveAttribute(
      'href',
      expect.stringContaining('tri=nom.asc'),
    );
  });

  it('reverses the direction when the column is already active', () => {
    render(<SortableHeader label="Nom" sort="nom" query={parseLeadsQuery({ tri: 'nom.asc' })} />);
    expect(screen.getByRole('link', { name: /Nom/ })).toHaveAttribute(
      'href',
      expect.stringContaining('tri=nom.desc'),
    );
  });

  it('resets the page, so a re-sort cannot strand the reader past the end', () => {
    render(<SortableHeader label="Nom" sort="nom" query={parseLeadsQuery({ tri: 'date.desc' })} />);
    expect(screen.getByRole('link', { name: /Nom/ })).not.toHaveAttribute(
      'href',
      expect.stringContaining('page='),
    );
  });

  it('keeps the campaign filter', () => {
    render(<SortableHeader label="Nom" sort="nom" query={parseLeadsQuery({})} />);
    expect(screen.getByRole('link', { name: /Nom/ })).toHaveAttribute(
      'href',
      expect.stringContaining('c=demo-rex-club'),
    );
  });

  it('tells assistive tech which way the active column is sorted', () => {
    const { container } = render(
      <SortableHeader label="Nom" sort="nom" query={parseLeadsQuery({ tri: 'nom.asc' })} />,
    );
    expect(container.querySelector('th')).toHaveAttribute('aria-sort', 'ascending');
  });

  it('marks an inactive column as unsorted rather than leaving it silent', () => {
    const { container } = render(
      <SortableHeader label="E-mail" sort="email" query={parseLeadsQuery({ tri: 'nom.asc' })} />,
    );
    expect(container.querySelector('th')).toHaveAttribute('aria-sort', 'none');
  });
});
