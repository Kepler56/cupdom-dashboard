import { SortableHeader } from '@/components/molecules/SortableHeader';
import { EmptyState } from '@/components/molecules/EmptyState';
import { toLeadViews } from '@/lib/analytics/leads';
import type { LeadsQuery } from '@/lib/analytics/leadsQuery';
import type { CampaignRow, LeadListRow } from '@/lib/analytics/types';

/**
 * The sponsor's captured contacts.
 *
 * A single « Contact » column rather than the spec's separate nom / prénom, and
 * that is a deliberate deviation: `toLeadViews` already resolves the three real
 * cases — a name, « Sans nom » for a lead who gave only an e-mail, and
 * « Contact anonymisé » for one whose details were erased — and two columns
 * would render the last two as pairs of em dashes that say nothing. The CSV
 * export keeps nom and prénom separate, because that is what an import needs.
 * Sorting by « Contact » sorts on `last_name`, as the spec's « nom » intends.
 */
export function LeadsTable({
  rows,
  campaigns,
  query,
}: {
  rows: LeadListRow[];
  campaigns: CampaignRow[];
  query: LeadsQuery;
}) {
  if (rows.length === 0) {
    // Two different nothings. « We found nothing for zzz » and « nobody has
    // filled in your form yet » would send a sponsor to completely different
    // conclusions about their campaign.
    return query.search ? (
      <EmptyState title="Aucun contact ne correspond">
        Aucun contact ne correspond à « {query.search} ». Essayez un autre nom ou une autre adresse.
      </EmptyState>
    ) : (
      <EmptyState title="Pas encore de contacts captés">
        Dès qu’une personne vous laisse ses coordonnées, elle apparaît ici.
      </EmptyState>
    );
  }

  const names = new Map(campaigns.map((c) => [c.slug, c.name]));
  const views = toLeadViews(rows);
  const anyAnonymised = views.some((v) => v.anonymised);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <SortableHeader label="Contact" sort="nom" query={query} />
              <SortableHeader label="E-mail" sort="email" query={query} />
              <th scope="col" className="pb-2 pr-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                Téléphone
              </th>
              <SortableHeader label="Campagne" sort="campagne" query={query} />
              <SortableHeader label="Capté le" sort="date" query={query} />
            </tr>
          </thead>
          <tbody>
            {views.map((lead, index) => (
              <tr key={lead.id} className="border-b border-border/60 last:border-0">
                <td className={['py-3 pr-3', lead.anonymised ? 'italic text-text-muted' : 'font-medium text-ink'].join(' ')}>
                  {lead.name}
                </td>
                <td className="py-3 pr-3 text-text-body">{lead.email ?? '—'}</td>
                <td className="py-3 pr-3 tabular-nums text-text-body">{lead.phone ?? '—'}</td>
                <td className="py-3 pr-3 text-text-body">
                  {names.get(rows[index].campaign_slug) ?? rows[index].campaign_slug}
                </td>
                <td className="py-3 text-text-body">{lead.dateLabel ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {anyAnonymised && (
        <p className="mt-4 text-xs text-text-muted">
          Certaines coordonnées ont été effacées à l’issue de la durée de conservation légale, ou à la demande
          de la personne. Le contact reste compté.
        </p>
      )}
    </>
  );
}
