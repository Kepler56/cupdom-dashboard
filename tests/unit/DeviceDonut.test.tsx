import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { DeviceDonut } from '@/components/charts/DeviceDonut';
import { buildRanking } from '@/lib/analytics/ranking';

const ranking = buildRanking([
  { label: 'Mobile', scans: 880 },
  { label: 'Ordinateur', scans: 80 },
  { label: 'Tablette', scans: 40 },
]);

// jsdom has no ResizeObserver at all, and Recharts 2.15's ResponsiveContainer
// calls `new ResizeObserver(...)` unconditionally in its mount effect. Scoped
// to this file, exactly as tests/unit/ScansArea.test.tsx does — this stub only
// stops the constructor call from throwing; it does not make the chart
// actually draw, since jsdom's getBoundingClientRect() still reports 0x0.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('DeviceDonut', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  // Recharts cannot draw inside jsdom — ResponsiveContainer measures its parent
  // and every element measures 0x0 — so the assertions here cover the legend,
  // which is where the numbers actually live. The arc itself is covered by the
  // Playwright run, which has a real layout engine.
  it('lists every device with its share', () => {
    render(<DeviceDonut ranking={ranking} />);
    expect(screen.getByText('Mobile')).toBeInTheDocument();
    expect(screen.getByText('88 %', { collapseWhitespace: false })).toBeInTheDocument();
  });

  it('renders an empty state rather than an empty ring', () => {
    render(<DeviceDonut ranking={buildRanking([])} />);
    expect(screen.getByText(/pas encore/i)).toBeInTheDocument();
  });
});
