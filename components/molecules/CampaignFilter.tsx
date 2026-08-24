'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export interface CampaignOption {
  slug: string;
  name: string;
}

/**
 * The campaign filter lives in the URL, like the period: what it changes is
 * what gets FETCHED, so it must be shareable, bookmarkable and server-rendered.
 * (The chart's metric toggle only re-draws data already sent, which is why that
 * one stays in local state.)
 */
export function CampaignFilter({ campaigns, current }: { campaigns: CampaignOption[]; current: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // A select with a single real option is furniture. Most clients have one
  // campaign, and this keeps their top bar clean.
  if (campaigns.length < 2) return null;

  function onChange(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set('c', value);
    else next.delete('c');
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <label className="inline-flex shrink-0 items-center gap-2">
      <span className="sr-only">Campagne</span>
      <select
        value={current ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className="max-w-[60vw] truncate rounded-[var(--radius-pill)] border border-border bg-surface px-3 py-2 text-base text-text outline-none focus:border-ink sm:max-w-none sm:py-1.5 sm:text-sm"
      >
        <option value="">Toutes les campagnes</option>
        {campaigns.map((campaign) => (
          <option key={campaign.slug} value={campaign.slug}>
            {campaign.name}
          </option>
        ))}
      </select>
    </label>
  );
}
