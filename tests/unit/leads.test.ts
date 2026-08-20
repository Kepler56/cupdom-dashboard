import { describe, expect, it } from 'vitest';
import { toLeadViews } from '@/lib/analytics/leads';
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

describe('toLeadViews', () => {
  it('assembles the display name from the two parts', () => {
    expect(toLeadViews([row()])[0].name).toBe('Camille Durand');
  });

  it('copes with only one of the two parts', () => {
    expect(toLeadViews([row({ last_name: null })])[0].name).toBe('Camille');
    expect(toLeadViews([row({ first_name: null })])[0].name).toBe('Durand');
  });

  it('dates the capture on the Paris calendar', () => {
    // 21:15 UTC on the 14th is 23:15 Paris the same day.
    expect(toLeadViews([row()])[0].dateLabel).toBe('14 août 2026');
  });

  it('rolls a post-midnight Paris capture to the right day', () => {
    // 2026-08-14T23:15Z is 01:15 Paris on the 15th — the nightlife case.
    expect(toLeadViews([row({ first_seen_at: '2026-08-14T23:15:00Z' })])[0].dateLabel).toBe('15 août 2026');
  });

  it('names an anonymised lead instead of rendering four blanks', () => {
    // run_lead_anonymisation() nulls the PII in place and KEEPS the row, so the
    // contact counts stay honest. The row must therefore explain itself.
    const view = toLeadViews([row({ first_name: null, last_name: null, email: null, phone: null })])[0];
    expect(view.anonymised).toBe(true);
    expect(view.name).toBe('Contact anonymisé');
    expect(view.email).toBeNull();
  });

  it('does not call a lead anonymised just because it has no name', () => {
    const view = toLeadViews([row({ first_name: null, last_name: null })])[0];
    expect(view.anonymised).toBe(false);
    expect(view.name).toBe('Sans nom');
  });

  it('treats whitespace-only PII as absent', () => {
    const view = toLeadViews([row({ first_name: ' ', last_name: '  ', email: '', phone: '   ' })])[0];
    expect(view.anonymised).toBe(true);
  });

  it('keeps the order it was given — the query decides, not this module', () => {
    const views = toLeadViews([row({ id: 'a' }), row({ id: 'b' })]);
    expect(views.map((v) => v.id)).toEqual(['a', 'b']);
  });
});
