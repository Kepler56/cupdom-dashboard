import { PeriodPicker } from '@/components/molecules/PeriodPicker';
import type { PeriodPreset } from '@/lib/period';

export function TopBar({ company, period }: { company: string; period: PeriodPreset }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-canvas px-6 py-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-text-muted">Portail client</p>
        <p className="font-display text-lg font-bold text-ink">{company}</p>
      </div>
      <PeriodPicker current={period} />
    </header>
  );
}
