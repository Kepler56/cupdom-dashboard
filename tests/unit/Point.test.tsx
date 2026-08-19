import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Point } from '@/components/atoms/Point';
import { Spinner } from '@/components/atoms/Spinner';

describe('Point — le point-couvercle', () => {
  it('renders a lid seen from above: an outer disc pierced by a straw hole', () => {
    const { container } = render(<Point />);
    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(2);
    // The hole must be materially smaller than the lid, or the mark reads as a plain dot.
    const outer = Number(circles[0].getAttribute('r'));
    const hole = Number(circles[1].getAttribute('r'));
    expect(hole).toBeLessThan(outer / 2);
  });

  it('honours the size prop on both axes', () => {
    const { container } = render(<Point size={32} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('32');
    expect(svg.getAttribute('height')).toBe('32');
  });

  it('is decorative by default, so screen readers skip it', () => {
    const { container } = render(<Point />);
    expect(container.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
  });

  // The hole is painted, not cut, so on a white card the default crème fill
  // reads as a beige dot rather than as the straw hole.
  it('accepts an explicit hole colour for use on white surfaces', () => {
    const { container } = render(<Point hole="var(--surface)" />);
    const circles = container.querySelectorAll('circle');
    expect(circles[1].getAttribute('fill')).toBe('var(--surface)');
  });
});

describe('Spinner', () => {
  it('announces itself in French with a live region', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toHaveTextContent('Chargement');
  });

  it('accepts a custom label', () => {
    render(<Spinner label="Chargement de vos campagnes" />);
    expect(screen.getByRole('status')).toHaveTextContent('Chargement de vos campagnes');
  });
});
