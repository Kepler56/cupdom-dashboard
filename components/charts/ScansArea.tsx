'use client';

import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHARTE } from '@/lib/charte';
import { formatNumber } from '@/lib/analytics/format';
import type { SeriesPoint } from '@/lib/analytics/series';

/**
 * One accent dominates per metric, and none of them is a colour the charte
 * forbids as a fill: Jaune Soleil for volume, Bleu Roi for people, Rose Flash
 * for the contacts that are the point of the whole product.
 *
 * `labelKey` names the server-formatted string on each SeriesPoint, so the
 * tooltip shows « 1 200 » rather than the raw datum.
 */
const METRICS = [
  { id: 'scans', label: 'Scans', color: CHARTE.jaune, labelKey: 'scansLabel' },
  { id: 'uniques', label: 'Personnes touchées', color: CHARTE.bleu, labelKey: 'uniquesLabel' },
  { id: 'leads', label: 'Contacts', color: CHARTE.rose, labelKey: 'leadsLabel' },
] as const satisfies readonly { id: string; label: string; color: string; labelKey: keyof SeriesPoint }[];

type MetricId = (typeof METRICS)[number]['id'];

/**
 * The metric switch is LOCAL state, not a URL parameter — unlike the period and
 * the campaign filter. It re-draws data the server already sent; it does not
 * change what is fetched, so putting it in the URL would add a navigation for
 * nothing.
 *
 * X-axis labels and every tooltip value arrive pre-formatted from the server
 * (`point.label`, `point.scansLabel` and friends). Formatting them here would
 * call Intl in the browser, whose ICU data may differ from Node's, and the
 * mismatch would surface as a hydration error on the dashboard's centrepiece.
 *
 * The Y axis is the one exception, and deliberately so — see the comment on its
 * tickFormatter below.
 */
export function ScansArea({ series }: { series: SeriesPoint[] }) {
  const [metric, setMetric] = useState<MetricId>('scans');
  const active = METRICS.find((m) => m.id === metric) ?? METRICS[0];

  return (
    <div>
      <div className="mb-4 flex max-w-full gap-1 overflow-x-auto rounded-[var(--radius-pill)] border border-border bg-canvas p-1 sm:inline-flex">
        {METRICS.map((m) => {
          const selected = m.id === metric;
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setMetric(m.id)}
              className={[
                'rounded-[var(--radius-pill)] px-3 py-1.5 text-sm transition-colors',
                selected ? 'bg-surface font-medium text-ink' : 'text-text-muted hover:text-text',
              ].join(' ')}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="h-56 w-full sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id={`fill-${active.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={active.color} stopOpacity={0.45} />
                <stop offset="100%" stopColor={active.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={CHARTE.border} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
              tick={{ fill: CHARTE.textMuted, fontSize: 12 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={48}
              tick={{ fill: CHARTE.textMuted, fontSize: 12 }}
              // The one place a pure formatter runs in the browser, and it cannot
              // cause a hydration mismatch: the tick values are derived from the
              // measured domain, and ResponsiveContainer measures its parent —
              // during SSR it renders nothing at all, so no axis tick is ever
              // part of the hydrated tree for React to compare against.
              tickFormatter={formatNumber}
            />
            <Tooltip
              cursor={{ stroke: CHARTE.border }}
              contentStyle={{
                borderRadius: 12,
                border: `1px solid ${CHARTE.border}`,
                background: CHARTE.blanc,
                fontSize: 13,
              }}
              labelStyle={{ color: CHARTE.encre, fontWeight: 600 }}
              // The raw `value` is deliberately ignored. The point being hovered
              // carries a server-formatted string for each metric; reading the
              // one matching the active metric keeps the tooltip in fr-FR
              // without an Intl call in the browser.
              formatter={(_value, _name, item) => {
                const point = item?.payload as SeriesPoint | undefined;
                return [point ? point[active.labelKey] : '', active.label] as [string, string];
              }}
            />
            <Area
              type="monotone"
              dataKey={active.id}
              stroke={active.color}
              strokeWidth={2}
              fill={`url(#fill-${active.id})`}
              // The dashboard is read, not animated. A chart that slides in on
              // every period change is slower to compare against the last one.
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
