import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import type { Trend as TrendModel } from '@/lib/analytics/kpis';

/**
 * Colour note: Jaune Soleil is never text — it fails contrast on white. Growth
 * is Bleu Roi and decline is Rose Flash, both charte-validated pairings on
 * white, and both distinguishable by their arrow as well as their hue.
 */
const STYLES = {
  up: { Icon: ArrowUpRight, className: 'text-bleu' },
  down: { Icon: ArrowDownRight, className: 'text-rose' },
  flat: { Icon: ArrowRight, className: 'text-text-muted' },
} as const;

export function Trend({ trend, label }: { trend: TrendModel; label: string | null }) {
  if (trend.kind === 'none' || label === null) return null;

  const { Icon, className } = STYLES[trend.kind];

  return (
    <span className={['inline-flex items-center gap-1 text-sm font-medium', className].join(' ')}>
      <Icon size={14} strokeWidth={2} aria-hidden="true" />
      {label}
      <span className="sr-only"> par rapport à la période précédente</span>
    </span>
  );
}
