import { Card } from '@/components/atoms/Card';
import { EmptyState } from '@/components/molecules/EmptyState';
import { formatNumber, formatRate } from '@/lib/analytics/format';
import type { CampaignRow } from '@/lib/analytics/types';

/**
 * Lifetime rollups, like the funnel — `client_campaigns()` takes no date range.
 * The subtitle says so rather than letting the period pills imply otherwise.
 *
 * No per-row sparkline in this stage: `client_scans_daily` takes a single
 * p_slug, so one line per row would be one round-trip per campaign. The fix is
 * an RPC returning slug-keyed daily rows, and it belongs with the Campagnes
 * page in stage 3.
 */
export function CampaignsTable({ campaigns }: { campaigns: CampaignRow[] }) {
  if (campaigns.length === 0) {
    return (
      <Card title="Vos campagnes">
        <EmptyState title="Aucune campagne pour le moment">
          Dès qu’une campagne est lancée pour vous, elle apparaît ici.
        </EmptyState>
      </Card>
    );
  }

  return (
    <Card title="Vos campagnes" subtitle="Totaux depuis le début">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
              <th scope="col" className="pb-2 pr-3 font-medium">Campagne</th>
              <th scope="col" className="pb-2 pr-3 font-medium">État</th>
              <th scope="col" className="pb-2 pr-3 text-right font-medium">Distribués</th>
              <th scope="col" className="pb-2 pr-3 text-right font-medium">Scans</th>
              <th scope="col" className="pb-2 pr-3 text-right font-medium">Personnes</th>
              <th scope="col" className="pb-2 pr-3 text-right font-medium">Contacts</th>
              <th scope="col" className="pb-2 text-right font-medium">Taux</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign.slug} className="border-b border-border/60 last:border-0">
                <td className="py-3 pr-3 font-medium text-ink">{campaign.name}</td>
                <td className="py-3 pr-3">
                  <span
                    className={[
                      'inline-block rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs',
                      campaign.active ? 'bg-signal text-ink' : 'bg-canvas text-text-muted',
                    ].join(' ')}
                  >
                    {campaign.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3 pr-3 text-right tabular-nums">
                  {campaign.distributed_count === null ? '—' : formatNumber(campaign.distributed_count)}
                </td>
                <td className="py-3 pr-3 text-right tabular-nums">{formatNumber(campaign.scans)}</td>
                <td className="py-3 pr-3 text-right tabular-nums">{formatNumber(campaign.uniques)}</td>
                <td className="py-3 pr-3 text-right tabular-nums">{formatNumber(campaign.leads)}</td>
                <td className="py-3 text-right tabular-nums">
                  {formatRate(campaign.leads, campaign.uniques)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
