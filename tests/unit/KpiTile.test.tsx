import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KpiTile } from '@/components/molecules/KpiTile';
import type { Kpi } from '@/lib/analytics/kpis';

const kpi = (over: Partial<Kpi> = {}): Kpi => ({
  id: 'scans',
  label: 'Scans totaux',
  value: '1\u202F000',
  hint: 'Toutes les interactions sur la période.',
  trend: { kind: 'up', value: 0.38, unit: 'percent' },
  trendLabel: '+38\u00A0%',
  sparkline: [1, 5, 3],
  ...over,
});

describe('KpiTile', () => {
  it('renders the label and the pre-formatted value', () => {
    render(<KpiTile kpi={kpi()} />);
    expect(screen.getByText('Scans totaux')).toBeInTheDocument();
    // RTL's default matcher normalizes the DOM's whitespace but never the
    // search string, so a value carrying fr-FR's narrow no-break space
    // (U+202F) as a thousands separator can never match without this option.
    expect(screen.getByText('1\u202F000', { collapseWhitespace: false })).toBeInTheDocument();
  });

  it('shows the trend badge when there is a trend', () => {
    render(<KpiTile kpi={kpi()} />);
    // Same nbsp-vs-normalizer gotcha as above: the trend label uses U+00A0
    // before the % sign.
    expect(screen.getByText('+38\u00A0%', { collapseWhitespace: false })).toBeInTheDocument();
  });

  // Spec §4.6-3: no trend at all is better than a trend computed on noise.
  it('shows no badge when the trend is none', () => {
    render(<KpiTile kpi={kpi({ trend: { kind: 'none', value: null, unit: 'percent' }, trendLabel: null })} />);
    expect(screen.queryByText(/%/)).toBeNull();
  });

  // Spec §4.6-2: the definition travels with the number, including for screen
  // readers — not only in a hover tooltip.
  it('exposes the hint to assistive technology', () => {
    render(<KpiTile kpi={kpi()} />);
    expect(screen.getByText('Toutes les interactions sur la période.')).toBeInTheDocument();
  });

  it('omits the sparkline when there is nothing to draw', () => {
    const { container } = render(<KpiTile kpi={kpi({ sparkline: [] })} />);
    expect(container.querySelector('polyline')).toBeNull();
  });
});
