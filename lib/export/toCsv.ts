/**
 * CSV for Excel in France. Ported verbatim from the CRM's `lib/export/toCsv.ts`,
 * which is already in production there.
 *
 * Every convention here exists for a reason a reader would otherwise undo:
 *
 * - **UTF-8 BOM.** Without it Excel decodes the file as the system codepage and
 *   « Café » becomes « CafÃ© ». The client's first impression of their export.
 * - **Semicolon, not comma.** Excel-FR's list separator IS the semicolon; a
 *   comma-separated file opens as one column per row and the client has to run
 *   Text-to-Columns before they can use it.
 * - **CRLF.** RFC 4180, and what Excel writes back if they re-save.
 * - **The formula guard.** A cell beginning `=`, `+`, `-`, `@`, TAB or CR is
 *   EXECUTED by Excel when the file is opened. A lead who types `=HYPERLINK(...)`
 *   into a name field is otherwise attacking whoever opens the export. This is
 *   the only escape here that protects a person rather than a format.
 */

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

const BOM = '﻿';
const SEP = ';';
const EOL = '\r\n';

export function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[;",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Serialise to a CSV string. Does NOT trigger a download — the caller decides. */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(SEP);
  const body = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(SEP));
  return BOM + [header, ...body].join(EOL);
}
