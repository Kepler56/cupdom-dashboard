import { Point } from './Point';

/**
 * Loading state built from the brand mark rather than a generic ring —
 * the point-couvercle rotating on its own axis.
 */
export function Spinner({ size = 20, label = 'Chargement…' }: { size?: number; label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-text-muted">
      <span className="animate-spin motion-reduce:animate-none" style={{ lineHeight: 0 }}>
        <Point size={size} filled={false} />
      </span>
      <span className="text-sm">{label}</span>
    </span>
  );
}
