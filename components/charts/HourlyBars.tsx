import { CHARTE } from '@/lib/charte';

/**
 * The 24-hour profile as vertical bars. Every hour is drawn, so the shape of
 * the night — the climb from 22 h, the collapse after 3 h — is the point.
 *
 * Each bar carries `role="img"` with its label. That is not decoration: an
 * `aria-label` on a bare <div> sits on an implicit `generic` role, which ARIA
 * 1.2 forbids from being named, so assistive tech drops it and all 24 values
 * announce as nothing. This chart is half of the WCAG 1.4.1 escape hatch — the
 * same data as the heatmap with no hue at all — so without a real accessible
 * name half of that mitigation does not exist.
 */
export function HourlyBars({
  totals,
}: {
  totals: { hour: number; label: string; scans: number; scansLabel: string }[];
}) {
  const leader = totals.reduce((m, h) => (h.scans > m ? h.scans : m), 0) || 1;

  return (
    <div className="flex h-32 items-end gap-[3px]">
      {totals.map((h) => (
        <div key={h.hour} className="flex flex-1 flex-col items-center gap-1">
          <div
            role="img"
            title={`${h.label} — ${h.scansLabel} scans`}
            aria-label={`${h.label} — ${h.scansLabel} scans`}
            className="w-full rounded-t-[3px]"
            style={{
              height: `${h.scans > 0 ? Math.max(2, (h.scans / leader) * 100) : 0}%`,
              backgroundColor: CHARTE.jaune,
            }}
          />
          <span className="text-[10px] text-text-muted">{h.hour % 6 === 0 ? h.hour : ''}</span>
        </div>
      ))}
    </div>
  );
}
