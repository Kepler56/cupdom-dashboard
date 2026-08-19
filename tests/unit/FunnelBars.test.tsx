import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FunnelBars } from '@/components/organisms/FunnelBars';
import { buildFunnel } from '@/lib/analytics/funnel';

describe('FunnelBars', () => {
  it('renders every stage with its label and value', () => {
    render(<FunnelBars funnel={buildFunnel({ distribues: 500, scannes: 200, formulaire_vu: 120, formulaire_soumis: 50, offre_atteinte: 40 })} />);
    expect(screen.getByText('Distribués')).toBeInTheDocument();
    expect(screen.getByText('Formulaire envoyé')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  // Spec §4.9. The funnel does NOT follow the period selector, and it says so —
  // otherwise a 7-day view whose first stage is an all-time total is a lie the
  // client cannot detect.
  it('states that it covers the whole campaign, not the selected period', () => {
    render(<FunnelBars funnel={buildFunnel({ distribues: 500, scannes: 200, formulaire_vu: 120, formulaire_soumis: 50, offre_atteinte: 40 })} />);
    expect(screen.getByText(/depuis le début/i)).toBeInTheDocument();
  });

  it('says so plainly when no distribution count has been entered', () => {
    render(<FunnelBars funnel={buildFunnel({ distribues: 0, scannes: 200, formulaire_vu: 120, formulaire_soumis: 50, offre_atteinte: 40 })} />);
    expect(screen.getByText(/non renseigné/i)).toBeInTheDocument();
    expect(screen.queryByText('Distribués')).toBeNull();
  });

  it('surfaces the worst drop-off sentence', () => {
    render(<FunnelBars funnel={buildFunnel({ distribues: 500, scannes: 200, formulaire_vu: 120, formulaire_soumis: 50, offre_atteinte: 40 })} />);
    expect(screen.getByText(/Votre plus gros décrochage/)).toBeInTheDocument();
  });
});
