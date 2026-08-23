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

/**
 * CROSS-REPOSITORY GOLDEN — keep in sync with cupdom.
 *
 * This module is an independent copy of cupdom/lib/campaigns/qr.ts +
 * redirectUrl.ts. There is no shared package between the two repositories, so
 * nothing structurally prevents them from drifting — and this file renders the
 * preview a sponsor compares against the code printed on their cover.
 *
 * Both repos pin the SAME digest for the SAME payload. The two derive it from
 * different primitives (cupdom from its module matrix, this one from the SVG
 * path), so the digest is rebuilt here from `d` rather than shared.
 *
 * If you change this golden, change cupdom/tests/unit/qr.test.ts in the same
 * commit.
 */
describe('cross-repo QR golden (must match cupdom)', () => {
  const PAYLOAD = 'https://cupdom.fr/s/demo-rex-club';
  const GOLDEN_SIZE = 33;
  const GOLDEN_SHA256 = '157424d28ebff982e854fbeb7fd548be8848fae69f19b371407289a103a1a1d5';

  async function sha256Hex(input: string): Promise<string> {
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Rebuild cupdom's canonical `size:bits` serialization from our path string.
   * Every dark module is emitted as `M{col+QUIET_ZONE} {row+QUIET_ZONE}h1v1h-1z`,
   * so the coordinates are recoverable exactly.
   */
  function serializeFromPath(d: string, size: number): string {
    const dark = new Set<string>();
    for (const m of d.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) {
      const col = Number(m[1]) - QUIET_ZONE;
      const row = Number(m[2]) - QUIET_ZONE;
      dark.add(`${row},${col}`);
    }
    let s = `${size}:`;
    for (let r = 0; r < size; r += 1) for (let c = 0; c < size; c += 1) s += dark.has(`${r},${c}`) ? '1' : '0';
    return s;
  }

  it('scanUrl produces the golden payload', () => {
    delete process.env.NEXT_PUBLIC_SCAN_BASE_URL;
    expect(scanUrl('demo-rex-club')).toBe(PAYLOAD);
  });

  it('the module matrix matches the digest pinned in cupdom', async () => {
    const { d, dim } = qrPath(PAYLOAD);
    const size = dim - QUIET_ZONE * 2;
    expect(size).toBe(GOLDEN_SIZE);
    expect(await sha256Hex(serializeFromPath(d, size))).toBe(GOLDEN_SHA256);
  });
});
