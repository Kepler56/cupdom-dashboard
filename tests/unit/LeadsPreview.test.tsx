import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LeadsPreview } from '@/components/organisms/LeadsPreview';
import type { LeadRow } from '@/lib/analytics/types';

const row = (over: Partial<LeadRow> = {}): LeadRow => ({
  id: 'a',
  first_name: 'Camille',
  last_name: 'Durand',
  email: 'camille.durand@example.test',
  phone: '+33612345678',
  first_seen_at: '2026-08-14T21:15:00Z',
  ...over,
});

describe('LeadsPreview', () => {
  it('shows the contact and says how many there are in total', () => {
    render(<LeadsPreview leads={[row()]} total={210} />);
    expect(screen.getByText('Camille Durand')).toBeInTheDocument();
    expect(screen.getByText(/210 au total depuis le début/, { collapseWhitespace: false })).toBeInTheDocument();
  });

  it('states the lawful basis on the page that shows the personal data', () => {
    render(<LeadsPreview leads={[row()]} total={1} />);
    expect(screen.getByText(/ont accepté que leurs coordonnées vous soient transmises/)).toBeInTheDocument();
  });

  it('explains an anonymised row once, not on every line', () => {
    render(
      <LeadsPreview
        leads={[row(), row({ id: 'b', first_name: null, last_name: null, email: null, phone: null })]}
        total={2}
      />,
    );
    expect(screen.getAllByText('Contact anonymisé')).toHaveLength(1);
    expect(screen.getAllByText(/conservation légale/)).toHaveLength(1);
  });

  it('says nothing about anonymisation when there is nothing to explain', () => {
    render(<LeadsPreview leads={[row()]} total={1} />);
    expect(screen.queryByText(/conservation légale/)).not.toBeInTheDocument();
  });

  it('distinguishes « no contacts yet » from « we could not read them »', () => {
    const { rerender } = render(<LeadsPreview leads={[]} total={0} />);
    expect(screen.getByText('Pas encore de contacts captés')).toBeInTheDocument();

    rerender(<LeadsPreview leads={null} total={0} />);
    expect(screen.getByText('Contacts indisponibles')).toBeInTheDocument();
    expect(screen.queryByText('Pas encore de contacts captés')).not.toBeInTheDocument();
  });
});
