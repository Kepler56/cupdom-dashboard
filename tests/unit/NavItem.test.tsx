import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Home } from 'lucide-react';
import { NavItem } from '@/components/molecules/NavItem';

describe('NavItem', () => {
  it('marks the active route for assistive tech', () => {
    render(<NavItem href="/" label="Vue d'ensemble" icon={Home} active />);
    expect(screen.getByRole('link')).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark an inactive route', () => {
    render(<NavItem href="/audience" label="Audience" icon={Home} active={false} />);
    expect(screen.getByRole('link')).not.toHaveAttribute('aria-current');
  });

  it('shows the point-couvercle marker ONLY on the active item', () => {
    // The dot is the brand's active-state signal (charte §07).
    const { container: activeC } = render(<NavItem href="/" label="Vue d'ensemble" icon={Home} active />);
    expect(activeC.querySelectorAll('svg').length).toBe(2); // icon + point

    const { container: inactiveC } = render(<NavItem href="/x" label="X" icon={Home} active={false} />);
    expect(inactiveC.querySelectorAll('svg').length).toBe(1); // icon only
  });
});
