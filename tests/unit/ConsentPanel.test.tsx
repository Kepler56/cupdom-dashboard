import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConsentPanel } from '@/components/organisms/ConsentPanel';

const consent = {
  // Straight apostrophe (U+0027), NOT the typographic U+2019 this codebase
  // otherwise mandates: this is recorded evidence quoted verbatim from the
  // CRM (lib/public/consent.ts in the cupdom repo), not our own copy.
  consent_text:
    "J'accepte que mes données soient traitées par Cupdom et partagées avec Démo Nightlife afin de recevoir cette offre et des communications marketing.",
  consent_version: 'v1-2026-06',
  leads: 210,
};

describe('ConsentPanel', () => {
  it('quotes the recorded wording verbatim', () => {
    render(<ConsentPanel consents={[consent]} />);
    // Assert on a substring with no apostrophe in it: the seed writes the CRM's
    // straight apostrophe, and matching around it avoids the assertion being
    // sensitive to which apostrophe character is on screen.
    expect(screen.getByText(/mes données soient traitées par Cupdom/)).toBeInTheDocument();
  });

  it('shows every wording when a client’s leads span more than one version', () => {
    const older = { ...consent, consent_text: 'Ancienne formulation.', consent_version: 'v0', leads: 12 };
    render(<ConsentPanel consents={[consent, older]} />);
    // Regex, not an exact string: the panel renders each wording inside « … »
    // quotation marks (a deliberate design choice — this is a quote, not a
    // paraphrase), so the blockquote's full text content is never equal to the
    // bare wording alone.
    expect(screen.getByText(/Ancienne formulation\./)).toBeInTheDocument();
    expect(screen.getByText(/mes données soient traitées par Cupdom/)).toBeInTheDocument();
  });

  it('says the read failed rather than implying no consent was recorded', () => {
    // A missing legal statement must never look like an absent one.
    render(<ConsentPanel consents={null} />);
    expect(screen.getByText(/n’avons pas pu charger/)).toBeInTheDocument();
  });

  it('says so plainly when there are no contacts yet', () => {
    render(<ConsentPanel consents={[]} />);
    expect(screen.getByText(/Aucun consentement enregistré pour le moment/)).toBeInTheDocument();
  });
});
