import { CampaignFilter, type CampaignOption } from '@/components/molecules/CampaignFilter';
import { MobileNav } from '@/components/organisms/MobileNav';
import { PeriodPicker } from '@/components/molecules/PeriodPicker';
import type { PeriodPreset } from '@/lib/period';

export function TopBar({
  company,
  period,
  campaigns,
  campaign,
  showCampaignFilter = true,
}: {
  company: string;
  period: PeriodPreset;
  campaigns: CampaignOption[];
  campaign: string | null;
  /**
   * False on /campagnes. That page IS the list of campaigns; filtering it to a
   * single row turns it into a worse detail page. Nothing is lost by hiding the
   * control there: the sidebar links carry no query string, so `?c=` does not
   * survive navigation between screens anyway.
   */
  showCampaignFilter?: boolean;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-border bg-canvas px-4 py-3 sm:px-6 sm:py-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-1">
        <MobileNav />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-text-muted">Portail client</p>
          <p className="truncate font-display text-base font-bold text-ink sm:text-lg">{company}</p>
        </div>
      </div>
      {/*
        `-mx-4 px-4` on the scroller, not `overflow-x-auto` on a padded box: the
        period pills must be able to run to the edge of a 390 px screen without
        their focus ring being clipped by the header's own padding.
      */}
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-0.5 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
        {showCampaignFilter && <CampaignFilter campaigns={campaigns} current={campaign} />}
        <PeriodPicker current={period} />
      </div>
    </header>
  );
}
