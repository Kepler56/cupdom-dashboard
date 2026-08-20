import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CampaignsTable } from '@/components/organisms/CampaignsTable';
import { MIN_SPARKLINE_VOLUME } from '@/lib/analytics/campaignSeries';
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
    render(<CampaignsTable period="30j" campaigns={[campaign(), campaign({ slug: 'nike-hiver', name: 'Nike hiver' })]} />);
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + 2
  });

  it('formats the figures in fr-FR', () => {
    render(<CampaignsTable period="30j" campaigns={[campaign()]} />);
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
    render(<CampaignsTable period="30j" campaigns={[campaign({ active: false })]} />);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('shows an empty state rather than an empty table', () => {
    render(<CampaignsTable period="30j" campaigns={[]} />);
    expect(screen.getByText(/aucune campagne/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });
});

describe('CampaignsTable \u2014 stage 3B additions', () => {
  it('links each campaign to its detail page, carrying the active period', () => {
    render(<CampaignsTable period="30j" campaigns={[campaign()]} />);
    expect(screen.getByRole('link', { name: 'Nike \u00E9t\u00E9' })).toHaveAttribute('href', '/campagnes/nike-ete?p=30j');
  });

  it('does not silently reset the period on the way to the detail page', () => {
    // A sponsor reading ?p=90j who clicks a campaign used to land on the
    // detail page's default 30 j, with every KPI changed under them and
    // nothing on screen saying why.
    render(<CampaignsTable period="90j" campaigns={[campaign()]} />);
    expect(screen.getByRole('link', { name: 'Nike \u00E9t\u00E9' })).toHaveAttribute('href', '/campagnes/nike-ete?p=90j');
  });

  it('carries \u00AB tout \u00BB too, which is the preset most easily lost', () => {
    render(<CampaignsTable period="tout" campaigns={[campaign()]} />);
    expect(screen.getByRole('link', { name: 'Nike \u00E9t\u00E9' })).toHaveAttribute('href', '/campagnes/nike-ete?p=tout');
  });

  it('renders no sparkline column when no series were supplied', () => {
    render(<CampaignsTable period="30j" campaigns={[campaign()]} />);
    expect(screen.queryByRole('columnheader', { name: 'Tendance' })).not.toBeInTheDocument();
  });

  it('carries the period total in text, because every other column is lifetime', () => {
    render(
      <CampaignsTable
        period="30j"
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
        period="30j"
        campaigns={[campaign()]}
        sparklines={{ 'nike-ete': { values: [], total: 0, totalLabel: '0', caption: 'x' } }}
      />,
    );
    expect(
      screen.getByText(
        'Totaux depuis le d\u00E9but \u00B7 courbe sur la p\u00E9riode s\u00E9lectionn\u00E9e. Personnes = comptage unique par jour, par campagne.',
        { collapseWhitespace: false },
      ),
    ).toBeInTheDocument();
  });

  it('keeps the lifetime-only subtitle when there is no curve to explain', () => {
    render(<CampaignsTable period="30j" campaigns={[campaign()]} />);
    expect(
      screen.getByText('Totaux depuis le d\u00E9but. Personnes = comptage unique par jour, par campagne.'),
    ).toBeInTheDocument();
  });

  it('accepts a title, so the page that is ABOUT campaigns does not say \u00AB Vos campagnes \u00BB twice', () => {
    render(<CampaignsTable period="30j" campaigns={[campaign()]} title="Toutes vos campagnes" />);
    expect(screen.getByRole('heading', { name: 'Toutes vos campagnes' })).toBeInTheDocument();
  });

  it('still renders a campaign whose series is missing entirely', () => {
    // Defence in depth: Task 3 degrades the sparkline RPC to {} when the
    // migration has not been applied, so every lookup misses.
    render(<CampaignsTable period="30j" campaigns={[campaign()]} sparklines={{}} />);
    expect(screen.getByText('Nike \u00E9t\u00E9')).toBeInTheDocument();
  });
});

// Spec \u00A74.6-2: \u00AB personnes touch\u00E9es \u00BB is defined wherever it appears. The
// definition belongs to the COMPONENT, not to the page: this table has two
// homes and only one of them (the Vue d'ensemble, beneath a KPI tile carrying
// the hint) has a neighbour that defines the term. On /campagnes the table is
// the entire page.
describe('CampaignsTable \u2014 \u00AB Personnes \u00BB is defined wherever the table goes', () => {
  const DEFINITION = /Personnes = comptage unique par jour, par campagne\./;

  it('defines the column in the subtitle when there is no curve', () => {
    render(<CampaignsTable period="30j" campaigns={[campaign()]} />);
    expect(screen.getByText(DEFINITION)).toBeInTheDocument();
  });

  it('defines it beside the lifetime / period disclosure when there is one', () => {
    render(
      <CampaignsTable
        period="30j"
        campaigns={[campaign()]}
        sparklines={{ 'nike-ete': { values: [4, 9], total: 13, totalLabel: '13', caption: 'x' } }}
      />,
    );
    expect(screen.getByText(DEFINITION)).toBeInTheDocument();
    // The disclosure that was already there must survive the addition.
    expect(screen.getByText(/Totaux depuis le d\u00E9but/)).toBeInTheDocument();
    expect(screen.getByText(/courbe sur la p\u00E9riode s\u00E9lectionn\u00E9e/)).toBeInTheDocument();
  });
});

// \u00A74.6-3: the trend column may not make a claim a client cannot check. Its only
// figure used to be sr-only text, and `Sparkline` auto-scales every row to its
// own min and max, so 1 \u2192 2 scans drew the same rising line as 400 \u2192 500.
describe('CampaignsTable \u2014 the trend column shows its number and floors its curve', () => {
  const sparkline = (total: number, values: number[]) => ({
    'nike-ete': {
      values,
      total,
      totalLabel: String(total),
      caption: `${total} scans sur la p\u00E9riode s\u00E9lectionn\u00E9e.`,
    },
  });

  it('prints the period total VISIBLY beside the curve', () => {
    const { container } = render(<CampaignsTable period="30j" campaigns={[campaign()]} sparklines={sparkline(140, [40, 100])} />);

    const label = screen.getByText('140');
    expect(label).not.toHaveClass('sr-only');
    // The curve is the only <svg> this table renders, so its presence is testable.
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('suppresses the curve below the volume floor and says so in VISIBLE text', () => {
    const under = MIN_SPARKLINE_VOLUME - 1;
    const { container } = render(
      <CampaignsTable period="30j" campaigns={[campaign()]} sparklines={sparkline(under, [3, 2, 4])} />,
    );

    expect(container.querySelector('svg')).toBeNull();
    expect(screen.getByText('Pas encore assez de scans')).not.toHaveClass('sr-only');
    // The figure is never withheld \u2014 only the shape that cannot be trusted.
    expect(screen.getByText(String(under))).toBeInTheDocument();
  });

  it('draws the curve exactly AT the floor, not one scan above it', () => {
    const { container } = render(
      <CampaignsTable period="30j" campaigns={[campaign()]} sparklines={sparkline(MIN_SPARKLINE_VOLUME, [4, 6])} />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.queryByText('Pas encore assez de scans')).not.toBeInTheDocument();
  });

  it('shows a dash rather than a blank cell when the series is missing entirely', () => {
    render(<CampaignsTable period="30j" campaigns={[campaign()]} sparklines={{}} />);
    expect(screen.getByText('\u2014')).toBeInTheDocument();
    expect(screen.getByText('Courbe indisponible.')).toBeInTheDocument();
  });
});
