import { afterEach, describe, expect, it } from 'vitest';
import { qrPath, QUIET_ZONE, scanBase, scanUrl } from '@/lib/qr';

const ORIGINAL = process.env.NEXT_PUBLIC_SCAN_BASE_URL;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_SCAN_BASE_URL;
  else process.env.NEXT_PUBLIC_SCAN_BASE_URL = ORIGINAL;
});

describe('scanBase', () => {
  it('falls back to the production origin', () => {
    delete process.env.NEXT_PUBLIC_SCAN_BASE_URL;
    expect(scanBase()).toBe('https://cupdom.fr');
  });

  it('strips trailing slashes so the path is never doubled', () => {
    process.env.NEXT_PUBLIC_SCAN_BASE_URL = 'https://staging.cupdom.fr///';
    expect(scanBase()).toBe('https://staging.cupdom.fr');
  });
});

describe('scanUrl', () => {
  it('builds exactly the string the printed QR encodes', () => {
    delete process.env.NEXT_PUBLIC_SCAN_BASE_URL;
    expect(scanUrl('demo-rex-club')).toBe('https://cupdom.fr/s/demo-rex-club');
  });

  it('does NOT percent-encode the slug', () => {
    // The CRM's redirectUrl.ts interpolates the slug raw, and the edge function
    // is routed at '/s/:slug'. Encoding here would produce a DIFFERENT QR from
    // the one on the cover for any slug with a non-alphanumeric character.
    delete process.env.NEXT_PUBLIC_SCAN_BASE_URL;
    expect(scanUrl('été 2026')).toBe('https://cupdom.fr/s/été 2026');
  });
});

describe('qrPath', () => {
  it('produces a drawable path with the quiet zone accounted for', () => {
    const { d, dim } = qrPath('https://cupdom.fr/s/demo-rex-club');
    expect(d.length).toBeGreaterThan(0);
    // The smallest QR version is 21 modules; the quiet zone adds 4 each side.
    expect(dim).toBeGreaterThanOrEqual(21 + QUIET_ZONE * 2);
  });

  it('is deterministic — the same slug always yields the same code', () => {
    const a = qrPath('https://cupdom.fr/s/demo-rex-club');
    const b = qrPath('https://cupdom.fr/s/demo-rex-club');
    expect(a).toEqual(b);
  });

  it('emits only closed unit squares, so no fill rule can surprise it', () => {
    const { d } = qrPath('https://cupdom.fr/s/demo-badaboum');
    expect(d).toMatch(/^(M\d+ \d+h1v1h-1z)+$/);
  });
});
