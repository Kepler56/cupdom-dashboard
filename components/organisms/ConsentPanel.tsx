import { Card } from '@/components/atoms/Card';
import { formatNumber } from '@/lib/analytics/format';
import type { ConsentRow } from '@/lib/data/consent';

/**
 * Spec §4.3-D and §4.4 — the exact wording these records rest on.
 *
 * Rendered as a quotation, not a paraphrase: this is the sentence each person
 * agreed to, and it is what Cupdom would produce if a client, or a regulator,
 * asked on what basis the sponsor holds these details. The recorded text uses
 * a straight apostrophe (the CRM's, not ours) — it is evidence, quoted
 * verbatim, and must render exactly as stored rather than as this codebase's
 * usual French typographic copy.
 */
export function ConsentPanel({ consents }: { consents: ConsentRow[] | null }) {
  if (consents === null) {
    return (
      <Card title="Base légale">
        <p className="text-sm text-text-body">
          Nous n’avons pas pu charger la formulation de consentement. Rechargez la page dans un instant.
        </p>
      </Card>
    );
  }

  if (consents.length === 0) {
    return (
      <Card title="Base légale">
        <p className="text-sm text-text-body">
          Aucun consentement enregistré pour le moment. La formulation apparaîtra ici dès votre premier
          contact capté.
        </p>
      </Card>
    );
  }

  return (
    <Card
      title="Base légale"
      subtitle="La formulation exacte que ces personnes ont acceptée au moment de laisser leurs coordonnées"
    >
      <div className="flex flex-col gap-4">
        {consents.map((consent) => (
          <div key={`${consent.consent_version ?? 'v?'}|${consent.consent_text}`}>
            <blockquote className="border-l-2 border-signal pl-3 text-sm italic text-text-body">
              « {consent.consent_text} »
            </blockquote>
            <p className="mt-1 text-xs text-text-muted">
              {formatNumber(consent.leads)} contact{consent.leads > 1 ? 's' : ''}
              {consent.consent_version ? ` · version ${consent.consent_version}` : ''}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
