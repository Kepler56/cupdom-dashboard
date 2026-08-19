import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import type { Trend as TrendModel } from '@/lib/analytics/kpis';

/**
 * Colour note, measured rather than asserted. Against white:
 * Bleu Roi #003082 is 12.03:1 and passes comfortably; Rose Flash #FF0099 is
 * **3.68:1**, below AA's 4.5:1 for normal text at this 14 px size. Jaune Soleil
 * is 1.55:1 and is never text at all.
 *
 * So the hue lives on the ARROW, which is a non-text graphical element held to
 * AA's 3:1, and the label itself is ink at 18.89:1. Direction is still carried
 * twice over — by the glyph and by its colour — and the number a client reads is
 * legible. The rule is applied to all three directions rather than to Rose alone
 * so the badge does not change weight depending on which way the figure moved.
 *
 * Not addressed here on purpose: --text-muted #8A8478 is 3.72:1 and likewise
 * fails AA, but it has carried labels and captions app-wide since stage 2A.
 * Changing it is a palette decision for the product owner, not a fix to smuggle
 * into a trend badge.
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
    <span className="inline-flex items-center gap-1 text-sm font-medium text-ink">
      {/* inline-flex on the wrapper: an svg inside a plain inline span sits on
          the text baseline and leaves a descender gap the old single-span markup
          did not have. */}
      <span className={['inline-flex', className].join(' ')}>
        <Icon size={14} strokeWidth={2} aria-hidden="true" />
      </span>
      {label}
      <span className="sr-only"> par rapport à la période précédente</span>
    </span>
  );
}
