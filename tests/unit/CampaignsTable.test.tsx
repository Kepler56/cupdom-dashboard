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

describe('CampaignsTable \u2014 stage 3B additions', () => {
  it('links each campaign to its detail page', () => {
    render(<CampaignsTable campaigns={[campaign()]} />);
    expect(screen.getByRole('link', { name: 'Nike \u00E9t\u00E9' })).toHaveAttribute('href', '/campagnes/nike-ete');
  });

  it('renders no sparkline column when no series were supplied', () => {
    render(<CampaignsTable campaigns={[campaign()]} />);
    expect(screen.queryByRole('columnheader', { name: 'Tendance' })).not.toBeInTheDocument();
  });

  it('carries the period total in text, because every other column is lifetime', () => {
    render(
      <CampaignsTable
        campaigns={[campaign()]}
        sparklines={{ 'nike-ete': { values: [1, 2, 3], total: 6, totalLabel: '6', caption: '6 scans sur la p\u00E9riode s\u00E9lectionn\u00E9e.' } }}
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Tendance' })).toBeInTheDocument();
    expect(screen.getByText('6 scans sur la p\u00E9riode s\u00E9lectionn\u00E9e.')).toBeInTheDocument();
  });

  it('says the two bases apart in the subtitle', () => {
    render(
      <CampaignsTable
        campaigns={[campaign()]}
        sparklines={{ 'nike-ete': { values: [], total: 0, totalLabel: '0', caption: 'x' } }}
      />,
    );
    expect(
      screen.getByText('Totaux depuis le d\u00E9but \u00B7 courbe sur la p\u00E9riode s\u00E9lectionn\u00E9e', { collapseWhitespace: false }),
    ).toBeInTheDocument();
  });

  it('keeps the lifetime-only subtitle when there is no curve to explain', () => {
    render(<CampaignsTable campaigns={[campaign()]} />);
    expect(screen.getByText('Totaux depuis le d\u00E9but')).toBeInTheDocument();
  });

  it('accepts a title, so the page that is ABOUT campaigns does not say \u00AB Vos campagnes \u00BB twice', () => {
    render(<CampaignsTable campaigns={[campaign()]} title="Toutes vos campagnes" />);
    expect(screen.getByRole('heading', { name: 'Toutes vos campagnes' })).toBeInTheDocument();
  });

  it('still renders a campaign whose series is missing entirely', () => {
    // Defence in depth: Task 3 degrades the sparkline RPC to {} when the
    // migration has not been applied, so every lookup misses.
    render(<CampaignsTable campaigns={[campaign()]} sparklines={{}} />);
    expect(screen.getByText('Nike \u00E9t\u00E9')).toBeInTheDocument();
  });
});
