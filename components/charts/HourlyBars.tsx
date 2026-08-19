import { CHARTE } from '@/lib/charte';

/**
 * The 24-hour profile as vertical bars. Every hour is drawn, so the shape of
 * the night — the climb from 22 h, the collapse after 3 h — is the point.
 */
export function HourlyBars({
  totals,
}: {
  totals: { hour: number; label: string; scans: number; share: number }[];
}) {
  const leader = totals.reduce((m, h) => (h.scans > m ? h.scans : m), 0) || 1;

  return (
    <div className="flex h-32 items-end gap-[3px]">
      {totals.map((h) => (
        <div key={h.hour} className="flex flex-1 flex-col items-center gap-1">
          <div
            title={`${h.label} — ${h.scans} scans`}
            aria-label={`${h.label} — ${h.scans} scans`}
            className="w-full rounded-t-[3px]"
            style={{
              height: `${Math.max(2, (h.scans / leader) * 100)}%`,
              backgroundColor: CHARTE.jaune,
            }}
          />
          <span className="text-[10px] text-text-muted">{h.hour % 6 === 0 ? h.hour : ''}</span>
        </div>
      ))}
    </div>
  );
}
