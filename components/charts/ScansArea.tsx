'use client';

import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHARTE } from '@/lib/charte';
import type { SeriesPoint } from '@/lib/analytics/series';

/**
 * One accent dominates per metric, and none of them is a colour the charte
 * forbids as a fill: Jaune Soleil for volume, Bleu Roi for people, Rose Flash
 * for the contacts that are the point of the whole product.
 */
const METRICS = [
  { id: 'scans', label: 'Scans', color: CHARTE.jaune },
  { id: 'uniques', label: 'Personnes touchées', color: CHARTE.bleu },
  { id: 'leads', label: 'Contacts', color: CHARTE.rose },
] as const;

type MetricId = (typeof METRICS)[number]['id'];

/**
 * The metric switch is LOCAL state, not a URL parameter — unlike the period and
 * the campaign filter. It re-draws data the server already sent; it does not
 * change what is fetched, so putting it in the URL would add a navigation for
 * nothing.
 *
 * Axis labels arrive pre-formatted from the server (`point.label`). Formatting
 * them here would call Intl in the browser, whose ICU data may differ from
 * Node's, and the mismatch would surface as a hydration error on the
 * dashboard's centrepiece.
 */
export function ScansArea({ series }: { series: SeriesPoint[] }) {
  const [metric, setMetric] = useState<MetricId>('scans');
  const active = METRICS.find((m) => m.id === metric) ?? METRICS[0];

  return (
    <div>
      <div className="mb-4 inline-flex gap-1 rounded-[var(--radius-pill)] border border-border bg-canvas p-1">
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

      <div className="h-64 w-full">
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
              formatter={(value: number) => [value, active.label] as [number, string]}
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
