import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StateBadge } from '@/components/atoms/StateBadge';

describe('StateBadge', () => {
  it('names the state in words, not only in colour', () => {
    render(<StateBadge active />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders the inactive state', () => {
    render(<StateBadge active={false} />);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('keeps inactive text on the body colour, not the muted one', () => {
    // #8A8478 on the crème #F4EFE3 measures 3.24:1 — below AA's 4.5:1, and this
    // is 12 px text. #4A4741 on the same ground measures 8.07:1.
    const { container } = render(<StateBadge active={false} />);
    const pill = container.firstElementChild;
    expect(pill?.className).toContain('text-text-body');
    expect(pill?.className).not.toContain('text-text-muted');
  });
});
