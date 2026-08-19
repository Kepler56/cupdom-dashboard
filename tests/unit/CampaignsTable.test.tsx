import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CampaignsTable } from '@/components/organisms/CampaignsTable';
import type { CampaignRow } from '@/lib/analytics/types';

const campaign = (over: Partial<CampaignRow> = {}): CampaignRow => ({
  slug: 'nike-ete',
  name: 'Nike été',
  sponsor_name: 'Nike',
  product: 'Couvercle',
  destination_url: 'https://example.test',
  active: true,
  venue: null,
  distributed_count: 500,
  invested_amount_eur: null,
  created_at: '2026-07-01T00:00:00Z',
  scans: 1200,
  uniques: 800,
  leads: 200,
  ...over,
});

describe('CampaignsTable', () => {
  it('renders one row per campaign', () => {
    render(<CampaignsTable campaigns={[campaign(), campaign({ slug: 'nike-hiver', name: 'Nike hiver' })]} />);
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + 2
  });

  it('formats the figures in fr-FR', () => {
    render(<CampaignsTable campaigns={[campaign()]} />);
    // `collapseWhitespace: false` is load-bearing, not decoration. Testing
    // Library's default normalizer collapses whitespace in the DOM TEXT but
    // never in the SEARCH STRING, and JS `\s` includes U+202F and U+00A0 - so
    // the DOM's `1\u202F200` becomes `1 200` while the matcher stays
    // `1\u202F200`, and the two can never be equal. Disabling only the collapse
    // (trim stays on) still catches a regression that formats a plain space.
    expect(screen.getByText('1\u202F200', { collapseWhitespace: false })).toBeInTheDocument();
    expect(screen.getByText('25\u00A0%', { collapseWhitespace: false })).toBeInTheDocument();
  });

  it('labels an inactive campaign', () => {
    render(<CampaignsTable campaigns={[campaign({ active: false })]} />);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('shows an empty state rather than an empty table', () => {
    render(<CampaignsTable campaigns={[]} />);
    expect(screen.getByText(/aucune campagne/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
