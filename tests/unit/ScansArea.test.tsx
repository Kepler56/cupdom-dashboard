import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScansArea } from '@/components/charts/ScansArea';
import type { SeriesPoint } from '@/lib/analytics/series';

const series: SeriesPoint[] = [
  { day: '2026-08-18', label: '18 août', scans: 40, uniques: 30, leads: 8 },
  { day: '2026-08-19', label: '19 août', scans: 60, uniques: 50, leads: 12 },
];

/**
 * jsdom has no ResizeObserver at all, and Recharts 2.15's ResponsiveContainer
 * calls `new ResizeObserver(...)` unconditionally in its mount effect, with no
 * feature check (recharts/lib/component/ResponsiveContainer.js:101). Scoped to
 * this file via vi.stubGlobal rather than a shared setup file — this is the
 * only test in the suite that renders a Recharts chart, so nothing else needs
 * it, and a global stub would be a trap for whoever adds the next one.
 *
 * This does NOT force the chart to actually render: jsdom's
 * getBoundingClientRect() still reports 0x0 for every element, so
 * ResponsiveContainer still measures nothing and the SVG still never draws.
 * The stub only stops the constructor call from throwing.
 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('ScansArea', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // The 0x0 measurement above is exactly the jsdom limitation the task briefs
    // describe, and Recharts warns about it on every render. That one warning is
    // known and expected, so it is swallowed here rather than polluting the
    // suite's output. Nothing else gets a free pass: a React 19 incompatibility,
    // a prop-type complaint, or a future Recharts deprecation would print a
    // DIFFERENT message and fail this assertion instead of hiding in the spy.
    for (const call of warnSpy.mock.calls) {
      expect(call[0]).toMatch(/width\(0\) and height\(0\)/);
    }
    warnSpy.mockRestore();
  });

  it('offers the three metrics as a toggle', () => {
    render(<ScansArea series={series} />);
    expect(screen.getByRole('button', { name: 'Scans' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Personnes touchées' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contacts' })).toBeInTheDocument();
  });

  it('starts on scans', () => {
    render(<ScansArea series={series} />);
    expect(screen.getByRole('button', { name: 'Scans' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches metric on click', async () => {
    render(<ScansArea series={series} />);
    await userEvent.click(screen.getByRole('button', { name: 'Contacts' }));
    expect(screen.getByRole('button', { name: 'Contacts' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Scans' })).toHaveAttribute('aria-pressed', 'false');
  });
});
