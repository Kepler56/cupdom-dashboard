import { CampaignFilter, type CampaignOption } from '@/components/molecules/CampaignFilter';
import { PeriodPicker } from '@/components/molecules/PeriodPicker';
import type { PeriodPreset } from '@/lib/period';

export function TopBar({
  company,
  period,
  campaigns,
  campaign,
}: {
  company: string;
  period: PeriodPreset;
  campaigns: CampaignOption[];
  campaign: string | null;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-canvas px-6 py-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-text-muted">Portail client</p>
        <p className="font-display text-lg font-bold text-ink">{company}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CampaignFilter campaigns={campaigns} current={campaign} />
        <PeriodPicker current={period} />
      </div>
    </header>
  );
}
