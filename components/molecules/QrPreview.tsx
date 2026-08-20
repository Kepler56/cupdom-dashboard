import { qrPath } from '@/lib/qr';
import { CHARTE } from '@/lib/charte';

/**
 * A Server Component on purpose: the matrix is deterministic from the slug, so
 * there is nothing for the browser to compute and no reason to ship a QR library
 * to it.
 *
 * `role="img"` with a name rather than `aria-hidden`: this is the one element on
 * the page that answers « c’est bien mon QR ? », and the URL it encodes is the
 * answer. A screen-reader user gets the URL read out; a sighted user reads the
 * same string printed beneath it in the header.
 */
export function QrPreview({ url, size = 128 }: { url: string; size?: number }) {
  const { d, dim } = qrPath(url);

  return (
    <svg
      role="img"
      aria-label={`QR code de la campagne : ${url}`}
      viewBox={`0 0 ${dim} ${dim}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className="shrink-0 rounded-[8px] border border-border"
    >
      {/* Blanc and Encre from the charte rather than pure #000/#fff. At EC level
          H the contrast is far beyond what any scanner needs, and a hard-coded
          hex in a component is a constraint violation. */}
      <rect width={dim} height={dim} fill={CHARTE.blanc} />
      <g fill={CHARTE.encre}>
        <path d={d} />
      </g>
    </svg>
  );
}
