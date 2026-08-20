import { StateBadge } from '@/components/atoms/StateBadge';
import { QrPreview } from '@/components/molecules/QrPreview';
import type { CampaignHeaderView } from '@/lib/analytics/campaign';

/**
 * The campaign's identity card.
 *
 * The QR and the scan URL sit together on purpose: the sponsor's question here
 * is « c’est bien ce qui est imprimé sur mes couvercles ? », and the answer is
 * the two of them agreeing. `lib/qr.ts` guarantees the string matches the CRM's
 * byte for byte.
 *
 * Every field is omitted when absent rather than shown with an em dash. A
 * header is an identity, not a form: « Lieu — » invites the reader to wonder
 * what went wrong, where silence invites nothing.
 */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-text-body">{children}</dd>
    </div>
  );
}

export function CampaignHeader({ header, scanUrl }: { header: CampaignHeaderView; scanUrl: string }) {
  return (
    <section className="flex flex-col gap-6 rounded-[var(--radius-card)] border border-border bg-surface p-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-ink">{header.name}</h1>
          <StateBadge active={header.active} />
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          {header.product && <Field label="Produit">{header.product}</Field>}
          {header.venue && <Field label="Lieu">{header.venue}</Field>}
          {header.destination && (
            <Field label="Destination">
              <a
                href={header.destination.href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-2 hover:underline"
              >
                {header.destination.host}
              </a>
            </Field>
          )}
          {header.createdLabel && <Field label="Lancée le">{header.createdLabel}</Field>}
        </dl>
      </div>

      <div className="flex flex-col items-center gap-2 sm:items-end">
        <QrPreview url={scanUrl} />
        <p className="break-all font-mono text-[11px] text-text-muted sm:text-right">{scanUrl}</p>
      </div>
    </section>
  );
}
