import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Pagination } from '@/components/molecules/Pagination';

vi.mock('next/navigation', () => ({
  usePathname: () => '/contacts',
  useSearchParams: () => new URLSearchParams('tri=nom.asc'),
}));

describe('Pagination', () => {
  it('says where the reader is, in words', () => {
    render(<Pagination page={2} pages={5} total={230} />);
    expect(screen.getByText('Page 2 sur 5', { exact: true })).toBeInTheDocument();
  });

  it('states the filtered total, formatted fr-FR', () => {
    render(<Pagination page={1} pages={5} total={1230} />);
    // U+202F between thousands — hence collapseWhitespace: false.
    expect(screen.getByText(/1 230 contacts/, { collapseWhitespace: false })).toBeInTheDocument();
  });

  it('renders nothing at all on a single page', () => {
    const { container } = render(<Pagination page={1} pages={1} total={12} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('offers no previous link on the first page and no next on the last', () => {
    const { rerender } = render(<Pagination page={1} pages={3} total={120} />);
    expect(screen.queryByRole('link', { name: 'Précédent' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Suivant' })).toBeInTheDocument();

    rerender(<Pagination page={3} pages={3} total={120} />);
    expect(screen.getByRole('link', { name: 'Précédent' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Suivant' })).not.toBeInTheDocument();
  });

  it('keeps the sort while moving between pages', () => {
    render(<Pagination page={2} pages={3} total={120} />);
    expect(screen.getByRole('link', { name: 'Suivant' })).toHaveAttribute(
      'href',
      expect.stringContaining('tri=nom.asc'),
    );
  });
});
