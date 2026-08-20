import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LeadsTable } from '@/components/organisms/LeadsTable';
import { parseLeadsQuery } from '@/lib/analytics/leadsQuery';
import type { CampaignRow, LeadListRow } from '@/lib/analytics/types';

vi.mock('next/navigation', () => ({
  usePathname: () => '/contacts',
  useSearchParams: () => new URLSearchParams(''),
}));

const row = (over: Partial<LeadListRow> = {}): LeadListRow => ({
  id: 'a',
  campaign_slug: 'demo-rex-club',
  first_name: 'Camille',
  last_name: 'Durand',
  email: 'camille.durand@example.test',
  phone: '+33612345678',
  first_seen_at: '2026-08-14T21:15:00Z',
  ...over,
});

const campaigns = [{ slug: 'demo-rex-club', name: 'Rex Club — Été' } as CampaignRow];
const query = parseLeadsQuery({});

describe('LeadsTable', () => {
  it('shows the contact, formatted for a reader', () => {
    render(<LeadsTable rows={[row()]} campaigns={campaigns} query={query} />);
    expect(screen.getByText('Camille Durand')).toBeInTheDocument();
    expect(screen.getByText('camille.durand@example.test')).toBeInTheDocument();
    expect(screen.getByText('14 août 2026')).toBeInTheDocument();
  });

  it('names the campaign rather than showing its slug', () => {
    render(<LeadsTable rows={[row()]} campaigns={campaigns} query={query} />);
    expect(screen.getByText('Rex Club — Été')).toBeInTheDocument();
    expect(screen.queryByText('demo-rex-club')).not.toBeInTheDocument();
  });

  it('falls back to the slug when a campaign is missing from the roster', () => {
    render(<LeadsTable rows={[row({ campaign_slug: 'inconnue' })]} campaigns={campaigns} query={query} />);
    expect(screen.getByText('inconnue')).toBeInTheDocument();
  });

  it('explains an anonymised row once, not on every line', () => {
    render(
      <LeadsTable
        rows={[row(), row({ id: 'b', first_name: null, last_name: null, email: null, phone: null })]}
        campaigns={campaigns}
        query={query}
      />,
    );
    expect(screen.getAllByText('Contact anonymisé')).toHaveLength(1);
    expect(screen.getAllByText(/conservation légale/)).toHaveLength(1);
  });

  it('distinguishes « no contacts yet » from « nothing matched your search »', () => {
    const { rerender } = render(<LeadsTable rows={[]} campaigns={campaigns} query={query} />);
    expect(screen.getByText('Pas encore de contacts captés')).toBeInTheDocument();

    rerender(<LeadsTable rows={[]} campaigns={campaigns} query={parseLeadsQuery({ q: 'zzz' })} />);
    expect(screen.getByText('Aucun contact ne correspond')).toBeInTheDocument();
    expect(screen.queryByText('Pas encore de contacts captés')).not.toBeInTheDocument();
  });
});
