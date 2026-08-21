import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SortableHeader } from '@/components/molecules/SortableHeader';
import { parseLeadsQuery } from '@/lib/analytics/leadsQuery';

vi.mock('next/navigation', () => ({
  usePathname: () => '/contacts',
  useSearchParams: () => new URLSearchParams('c=demo-rex-club&page=7&tri=date.desc'),
}));

// A real <table><thead><tr> wrapper, not a bare <div>: `<th>` is only valid
// HTML inside a row inside a table, and `aria-sort`'s semantics are defined
// for a columnheader inside that structure. Rendering the header standalone
// would both print a hydration-mismatch warning and prove the attribute is
// merely PRESENT rather than that it means what a screen reader would hear.
function renderHeader(ui: React.ReactElement) {
  return render(
    <table>
      <thead>
        <tr>{ui}</tr>
      </thead>
    </table>,
  );
}

describe('SortableHeader', () => {
  it('sorts a new column ascending on first click', () => {
    renderHeader(<SortableHeader label="Nom" sort="nom" query={parseLeadsQuery({ tri: 'date.desc' })} />);
    expect(screen.getByRole('link', { name: /Nom/ })).toHaveAttribute(
      'href',
      expect.stringContaining('tri=nom.asc'),
    );
  });

  it('reverses the direction when the column is already active', () => {
    renderHeader(<SortableHeader label="Nom" sort="nom" query={parseLeadsQuery({ tri: 'nom.asc' })} />);
    expect(screen.getByRole('link', { name: /Nom/ })).toHaveAttribute(
      'href',
      expect.stringContaining('tri=nom.desc'),
    );
  });

  it('resets the page, so a re-sort cannot strand the reader past the end', () => {
    renderHeader(<SortableHeader label="Nom" sort="nom" query={parseLeadsQuery({ tri: 'date.desc' })} />);
    expect(screen.getByRole('link', { name: /Nom/ })).not.toHaveAttribute(
      'href',
      expect.stringContaining('page='),
    );
  });

  it('keeps the campaign filter', () => {
    renderHeader(<SortableHeader label="Nom" sort="nom" query={parseLeadsQuery({})} />);
    expect(screen.getByRole('link', { name: /Nom/ })).toHaveAttribute(
      'href',
      expect.stringContaining('c=demo-rex-club'),
    );
  });

  it('tells assistive tech which way the active column is sorted', () => {
    const { container } = renderHeader(
      <SortableHeader label="Nom" sort="nom" query={parseLeadsQuery({ tri: 'nom.asc' })} />,
    );
    expect(container.querySelector('th')).toHaveAttribute('aria-sort', 'ascending');
  });

  it('marks an inactive column as unsorted rather than leaving it silent', () => {
    const { container } = renderHeader(
      <SortableHeader label="E-mail" sort="email" query={parseLeadsQuery({ tri: 'nom.asc' })} />,
    );
    expect(container.querySelector('th')).toHaveAttribute('aria-sort', 'none');
  });
});
