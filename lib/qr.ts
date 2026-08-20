import qrcode from 'qrcode-generator';

/**
 * The QR the sponsor's cover actually carries, rendered for the portal.
 *
 * NOT under lib/analytics: this module reads `process.env`, and that directory's
 * contract is that its modules are pure.
 *
 * THE rule for this file: the string encoded here must be byte-identical to the
 * string the CRM encodes in `lib/campaigns/redirectUrl.ts`, because the sponsor
 * compares this image with the object in their hand. That is why the slug is
 * interpolated raw and why the error-correction level is pinned to the same 'H'
 * the print path uses — a preview that scans differently from the cover is worse
 * than no preview at all.
 */

/** Error-correction level used everywhere: print, CRM screen, and here. */
export const EC_LEVEL = 'H' as const;

/** Quiet-zone width in modules — the QR specification's minimum. */
export const QUIET_ZONE = 4;

/** Scan origin, no trailing slash. Defaults to the production domain. */
export function scanBase(): string {
  const raw = process.env.NEXT_PUBLIC_SCAN_BASE_URL ?? 'https://cupdom.fr';
  return raw.replace(/\/+$/, '');
}

/**
 * The string a campaign's QR encodes.
 *
 * No `encodeURIComponent`, deliberately: the CRM interpolates the slug raw and
 * the Netlify edge function is routed at `/s/:slug`. Encoding here would render
 * a different code from the printed one for any slug carrying a character
 * outside the unreserved set.
 */
export function scanUrl(slug: string): string {
  return `${scanBase()}/s/${slug}`;
}

export interface QrPath {
  /** An SVG path — one closed unit square per dark module. */
  d: string;
  /** viewBox edge length, quiet zone included. */
  dim: number;
}

/**
 * The module matrix as a single `<path>`.
 *
 * One path rather than ~700 `<rect>` elements: at EC level H a scan URL lands
 * around version 4-5, which is 33-37 modules a side and roughly half of them
 * dark. As React elements that is tens of kilobytes of markup for one static
 * image; as a path string it is a few.
 *
 * `M x yh1v1h-1z` closes each square explicitly, so the result is insensitive to
 * the renderer's fill rule.
 */
export function qrPath(text: string): QrPath {
  const qr = qrcode(0, EC_LEVEL); // typeNumber 0 = auto-fit to the payload
  qr.addData(text);
  qr.make();

  const size = qr.getModuleCount();
  let d = '';
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (qr.isDark(row, col)) d += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
    }
  }

  return { d, dim: size + QUIET_ZONE * 2 };
}
