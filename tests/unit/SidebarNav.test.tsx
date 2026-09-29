import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ pathname: '/', params: new URLSearchParams() }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => nav.params,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { SidebarNav } from '@/components/organisms/SidebarNav';

beforeEach(() => {
  nav.pathname = '/';
  nav.params = new URLSearchParams();
});

describe('SidebarNav', () => {
  it('highlights the section of the CURRENT url, not the first-loaded one', () => {
    nav.pathname = '/campagnes';
    render(<SidebarNav />);
    expect(screen.getByRole('link', { name: /Campagnes/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Vue d’ensemble/ })).not.toHaveAttribute('aria-current');
  });

  it('highlights « Vue d’ensemble » only on /', () => {
    render(<SidebarNav />);
    expect(screen.getByRole('link', { name: /Vue d’ensemble/ })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps ?client on every link and matches a detail page to its section', () => {
    nav.pathname = '/campagnes/demo-rex-club';
    nav.params = new URLSearchParams('client=abc-123');
    render(<SidebarNav />);
    const link = screen.getByRole('link', { name: /Campagnes/ });
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(link).toHaveAttribute('href', '/campagnes?client=abc-123');
  });
});
