import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Sparkline } from '@/components/charts/Sparkline';

function polyline(container: HTMLElement): SVGPolylineElement | null {
  return container.querySelector('polyline');
}

describe('Sparkline', () => {
  it('draws one vertex per value', () => {
    const { container } = render(<Sparkline values={[1, 4, 2, 8]} color="#FCC917" />);
    expect(polyline(container)?.getAttribute('points')?.trim().split(/\s+/)).toHaveLength(4);
  });

  // One point is not a line, and rendering a bare dot in a KPI tile reads as a
  // rendering bug rather than as "not enough data".
  it('renders nothing below two values', () => {
    const { container } = render(<Sparkline values={[5]} color="#FCC917" />);
    expect(polyline(container)).toBeNull();
  });

  // A flat series has no range to scale against. Dividing by it emits NaN into
  // the path attribute and the whole SVG silently disappears.
  it('draws a flat series as a horizontal line, with no NaN in the path', () => {
    const { container } = render(<Sparkline values={[7, 7, 7]} color="#FCC917" />);
    const points = polyline(container)?.getAttribute('points') ?? '';
    expect(points).not.toContain('NaN');
    const ys = points.trim().split(/\s+/).map((p) => p.split(',')[1]);
    expect(new Set(ys).size).toBe(1);
  });

  it('uses the colour it was given', () => {
    const { container } = render(<Sparkline values={[1, 2]} color="#003082" />);
    expect(polyline(container)?.getAttribute('stroke')).toBe('#003082');
  });
});
