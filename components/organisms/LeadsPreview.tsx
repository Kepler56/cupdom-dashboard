import { Card } from '@/components/atoms/Card';
import { EmptyState } from '@/components/molecules/EmptyState';
import { formatNumber } from '@/lib/analytics/format';
import { toLeadViews } from '@/lib/analytics/leads';
import type { LeadRow } from '@/lib/analytics/types';

/**
 * The most recent captured contacts — the tangible thing the sponsor takes away.
 *
 * `leads === null` means the read FAILED, and it gets its own state. An empty
 * table and a broken query look identical to a client, and « you captured
 * nobody » is exactly the false zero §4.6 exists to forbid.
 *
 * No CSV export and no link to /contacts here: that page is stage 3C and 404s
 * until then. A dead link in a client-facing product is worse than an absent one.
 */
export function LeadsPreview({ leads, total }: { leads: LeadRow[] | null; total: number }) {
  if (leads === null) {
    return (
      <Card title="Contacts captés">
        <EmptyState title="Contacts indisponibles">
          Nous n’avons pas pu charger vos contacts. Rechargez la page dans un instant.
        </EmptyState>
      </Card>
    );
  }

  if (leads.length === 0) {
    return (
      <Card title="Contacts captés">
        <EmptyState title="Pas encore de contacts captés">
          Dès qu’une personne vous laisse ses coordonnées, elle apparaît ici.
        </EmptyState>
      </Card>
    );
  }

  const views = toLeadViews(leads);
  const anyAnonymised = views.some((v) => v.anonymised);

  return (
    <Card
      title="Contacts captés"
      subtitle={`Les ${views.length} plus récents · ${formatNumber(total)} au total depuis le début`}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
              <th scope="col" className="pb-2 pr-3 font-medium">Nom</th>
              <th scope="col" className="pb-2 pr-3 font-medium">E-mail</th>
              <th scope="col" className="pb-2 pr-3 font-medium">Téléphone</th>
              <th scope="col" className="pb-2 font-medium">Capté le</th>
            </tr>
          </thead>
          <tbody>
            {views.map((lead) => (
              <tr key={lead.id} className="border-b border-border/60 last:border-0">
                <td className={['py-3 pr-3', lead.anonymised ? 'italic text-text-muted' : 'font-medium text-ink'].join(' ')}>
                  {lead.name}
                </td>
                <td className="py-3 pr-3 text-text-body">{lead.email ?? '—'}</td>
                <td className="py-3 pr-3 tabular-nums text-text-body">{lead.phone ?? '—'}</td>
                <td className="py-3 text-text-body">{lead.dateLabel ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Spec §4.4. The page that shows the personal data is the page that says
          why we may show it. */}
      <p className="mt-4 text-xs text-text-muted">
        Ces personnes ont accepté que leurs coordonnées vous soient transmises, au moment où elles ont rempli le
        formulaire.
      </p>

      {/* Once for the whole card, not per row: a table where four lines each
          carry the same paragraph is unreadable. */}
      {anyAnonymised && (
        <p className="mt-2 text-xs text-text-muted">
          Certaines coordonnées ont été effacées à l’issue de la durée de conservation légale, ou à la demande de la
          personne. Le contact reste compté.
        </p>
      )}
    </Card>
  );
}
