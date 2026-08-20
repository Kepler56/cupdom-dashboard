import { formatNumber } from './format';
import { seriesWindow } from './series';
import type { CampaignDailyRow } from './types';

/**
 * PURE. The campaigns table's sparkline column.
 *
 * Two properties the table depends on, both easy to lose:
 *
 * 1. **One window for every row.** The window is computed once across all
 *    campaigns and every series is drawn over it. Per-campaign windows would
 *    render a three-day-old campaign and a six-month one at the same width, and
 *    a reader comparing two rows would be comparing two different time scales.
 * 2. **Every requested slug gets an entry.** `client_campaigns_daily` omits
 *    campaigns with no scans in the window entirely, so the slugs must come
 *    from the campaign list, not from the rows. A campaign with no activity is
 *    a flat zero line, which is information; a missing key would be a hole in
 *    the table.
 */
export function groupCampaignSeries(args: {
  rows: CampaignDailyRow[];
  slugs: string[];
  from: Date | null;
  to: Date;
}): Record<string, number[]> {
  const days = seriesWindow(
    args.rows.map((r) => r.day),
    args.from,
    args.to,
  );

  const byKey = new Map(args.rows.map((r) => [`${r.slug}|${r.day}`, r.scans]));

  const out: Record<string, number[]> = {};
  for (const slug of args.slugs) {
    out[slug] = days.map((day) => byKey.get(`${slug}|${day}`) ?? 0);
  }
  return out;
}

export interface CampaignSparkline {
  values: number[];
  total: number;
  /** Already formatted fr-FR. Components never format. */
  totalLabel: string;
  /**
   * What a screen reader hears in place of the curve, and what a pointer sees
   * on hover.
   *
   * Not decoration. `Sparkline` is `aria-hidden`, so without this the column
   * would announce its header and then silence. And the number it carries is
   * genuinely absent from the rest of the row: every other column in that table
   * is a LIFETIME total, while this one is the selected period.
   */
  caption: string;
}

const NO_DATA = 'Pas encore de scans sur la période sélectionnée.';

export function toSparklines(series: Record<string, number[]>): Record<string, CampaignSparkline> {
  const out: Record<string, CampaignSparkline> = {};

  for (const [slug, values] of Object.entries(series)) {
    const total = values.reduce((sum, v) => sum + v, 0);
    const totalLabel = formatNumber(total);
    // Fewer than two points is what `Sparkline` itself refuses to draw — one
    // point is not a line, and a lone dot reads as a bug rather than as "not
    // enough data yet". The caption says which of the two it is.
    out[slug] = {
      values,
      total,
      totalLabel,
      caption: values.length < 2 ? NO_DATA : `${totalLabel} scans sur la période sélectionnée.`,
    };
  }

  return out;
}
