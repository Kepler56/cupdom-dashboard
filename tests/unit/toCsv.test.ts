import { describe, expect, it } from 'vitest';
import { escapeCell, toCsv, type CsvColumn } from '@/lib/export/toCsv';

interface Row { nom: string; montant: number | null }
const COLUMNS: CsvColumn<Row>[] = [
  { header: 'Nom', value: (r) => r.nom },
  { header: 'Montant', value: (r) => r.montant },
];

describe('escapeCell', () => {
  it('renders null and undefined as an empty cell', () => {
    expect(escapeCell(null)).toBe('');
    expect(escapeCell(undefined)).toBe('');
  });

  it('leaves an ordinary value alone', () => {
    expect(escapeCell('Durand')).toBe('Durand');
    expect(escapeCell(42)).toBe('42');
  });

  it('quote-wraps a value containing the separator, a quote, a comma or a newline', () => {
    expect(escapeCell('a;b')).toBe('"a;b"');
    expect(escapeCell('a,b')).toBe('"a,b"');
    expect(escapeCell('a\nb')).toBe('"a\nb"');
    expect(escapeCell('dit "bonjour"')).toBe('"dit ""bonjour"""');
  });

  it('defuses a formula-injection payload', () => {
    // A cell starting =,+,-,@,TAB or CR is executed by Excel on open. This is
    // the one escape that protects the PERSON OPENING THE FILE, not the format.
    expect(escapeCell('=1+1')).toBe("'=1+1");
    expect(escapeCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(escapeCell('-2+3')).toBe("'-2+3");
    expect(escapeCell('+1')).toBe("'+1");
  });
});

describe('toCsv', () => {
  it('starts with a UTF-8 BOM so Excel renders accents', () => {
    expect(toCsv<Row>([], COLUMNS).startsWith('\uFEFF')).toBe(true);
  });

  it('writes the French headers in column order, semicolon-separated', () => {
    expect(toCsv<Row>([], COLUMNS)).toBe('\uFEFFNom;Montant');
  });

  it('separates records with CRLF, per RFC 4180', () => {
    const csv = toCsv<Row>([{ nom: 'Durand', montant: 12 }], COLUMNS);
    expect(csv).toBe('\uFEFFNom;Montant\r\nDurand;12');
  });

  it('renders a null value as an empty cell rather than the word null', () => {
    const csv = toCsv<Row>([{ nom: 'Durand', montant: null }], COLUMNS);
    expect(csv.endsWith('Durand;')).toBe(true);
  });
});
