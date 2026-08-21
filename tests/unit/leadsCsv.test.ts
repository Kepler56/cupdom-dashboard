import { describe, expect, it } from 'vitest';
import { LEAD_CSV_COLUMNS, leadsCsvFilename } from '@/lib/export/leadsCsv';
import { toCsv } from '@/lib/export/toCsv';
import type { LeadListRow } from '@/lib/analytics/types';

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

describe('LEAD_CSV_COLUMNS', () => {
  it('uses the French headers the spec names, in order', () => {
    expect(LEAD_CSV_COLUMNS.map((c) => c.header)).toEqual([
      'Nom', 'Prénom', 'E-mail', 'Téléphone', 'Campagne', 'Capté le',
    ]);
  });

  it('keeps nom and prénom in separate columns, unlike the on-screen table', () => {
    const csv = toCsv([row()], LEAD_CSV_COLUMNS);
    expect(csv).toContain('Durand;Camille;');
  });

  it('dates the capture on the Paris calendar', () => {
    // 21:15 UTC on the 14th is 23:15 Paris the same day.
    expect(toCsv([row()], LEAD_CSV_COLUMNS)).toContain('14/08/2026');
    // 23:15 UTC is 01:15 Paris the NEXT day — the nightlife case.
    expect(toCsv([row({ first_seen_at: '2026-08-14T23:15:00Z' })], LEAD_CSV_COLUMNS)).toContain('15/08/2026');
  });

  it('writes an anonymised lead as empty cells, not as the words we show on screen', () => {
    // « Contact anonymisé » is a UI affordance. In a spreadsheet it would look
    // like a person's name and could be mail-merged.
    const csv = toCsv([row({ first_name: null, last_name: null, email: null, phone: null })], LEAD_CSV_COLUMNS);
    expect(csv).not.toContain('anonymisé');
    expect(csv).toContain(';;;;demo-rex-club;');
  });

  it('does not leak the internal id', () => {
    expect(LEAD_CSV_COLUMNS.map((c) => c.header).join()).not.toMatch(/id/i);
    expect(toCsv([row()], LEAD_CSV_COLUMNS)).not.toContain('a;');
  });
});

describe('leadsCsvFilename', () => {
  it('dates the file so two exports do not overwrite each other', () => {
    expect(leadsCsvFilename(new Date('2026-08-20T09:00:00Z'), null)).toBe('contacts-cupdom-2026-08-20.csv');
  });

  it('names the campaign when the export is filtered to one', () => {
    expect(leadsCsvFilename(new Date('2026-08-20T09:00:00Z'), 'demo-rex-club')).toBe(
      'contacts-demo-rex-club-2026-08-20.csv',
    );
  });

  it('strips anything a filename cannot safely carry', () => {
    expect(leadsCsvFilename(new Date('2026-08-20T09:00:00Z'), 'a/b"c')).toBe('contacts-abc-2026-08-20.csv');
  });
});
