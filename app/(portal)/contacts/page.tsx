import { AccessDenied } from '@/components/molecules/AccessDenied';
import { ErrorState } from '@/components/molecules/ErrorState';
import { Pagination } from '@/components/molecules/Pagination';
import { SearchBox } from '@/components/molecules/SearchBox';
import { Card } from '@/components/atoms/Card';
import { ConsentPanel } from '@/components/organisms/ConsentPanel';
import { LeadsTable } from '@/components/organisms/LeadsTable';
import { TopBar } from '@/components/organisms/TopBar';
import { EXPORT_MAX_ROWS } from '@/lib/analytics/leadsQuery';
import { formatNumber } from '@/lib/analytics/format';
import { loadConsents } from '@/lib/data/consent';
import { fetchLeadsPage } from '@/lib/data/leadsPage';
import { parsePeriod } from '@/lib/period';
import { getClientAccount } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';
import { Download } from 'lucide-react';

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; c?: string; tri?: string; q?: string; page?: string }>;
}) {
  const account = await getClientAccount();
  const params = await searchParams;
  // The period pills do not govern this page — a captured contact is a fact with
  // a date, not a figure over a window — but TopBar renders them, so the value
  // is read to keep the control consistent and the URL intact across navigation.
  const period = parsePeriod(params.p);
  const result = await fetchLeadsPage({ rawSlug: params.c, params });
  const company = account?.displayName ?? 'Votre compte';

  if (!result.ok) {
    return (
      <>
        <TopBar company={company} period={period} campaigns={[]} campaign={null} />
        <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
          {result.failure.kind === 'refused' ? <AccessDenied /> : <ErrorState message={result.failure.message} />}
        </main>
      </>
    );
  }

  const { campaigns, slug, query, rows, total, pages } = result.data;

  // Sequential, after the page's own read: this cannot fail the screen, and the
  // panel renders its own failure state. Same reasoning as loadSparklines, with
  // the opposite visibility — see lib/data/consent.ts.
  const consents = await loadConsents(await createServerClient());

  const exportParams = new URLSearchParams();
  if (slug) exportParams.set('c', slug);
  if (query.search) exportParams.set('q', query.search);
  exportParams.set('tri', `${query.sort}.${query.dir}`);
  const truncated = total > EXPORT_MAX_ROWS;

  return (
    <>
      <TopBar
        company={company}
        period={period}
        campaigns={campaigns.map((c) => ({ slug: c.slug, name: c.name }))}
        campaign={slug}
      />

      <main className="flex flex-1 flex-col gap-4 p-4 sm:gap-6 sm:p-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink sm:text-2xl">Contacts captés</h1>
          <p className="mt-1 text-sm text-text-muted">
            Les personnes qui vous ont laissé leurs coordonnées, avec leur consentement.
          </p>
        </div>

        <Card
          title="Vos contacts"
          subtitle={
            query.search
              ? `Recherche : « ${query.search} » · ${formatNumber(total)} résultat${total > 1 ? 's' : ''}`
              : `${formatNumber(total)} contact${total > 1 ? 's' : ''} depuis le début`
          }
          action={
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <SearchBox initial={query.search ?? ''} />
              {total > 0 && (
                <a
                  href={`/contacts/export?${exportParams.toString()}`}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[var(--radius-pill)] bg-ink px-4 py-2 text-sm font-medium text-white sm:min-h-0 sm:px-3 sm:py-1.5"
                >
                  <Download size={15} aria-hidden="true" />
                  Exporter en CSV
                </a>
              )}
            </div>
          }
        >
          <LeadsTable rows={rows} campaigns={campaigns} query={query} />
          <Pagination page={query.page} pages={pages} total={total} />

          {/* Before the click, never after. A sponsor who exports 5 000 of
              12 000 contacts and only finds out by counting rows has built a
              campaign on data they believed was complete. */}
          {truncated && (
            <p className="mt-3 text-xs text-text-muted">
              L’export est limité aux {formatNumber(EXPORT_MAX_ROWS)} premières lignes du tri affiché.
              Affinez la recherche ou filtrez par campagne pour exporter le reste.
            </p>
          )}
        </Card>

        <ConsentPanel consents={consents} />
      </main>
    </>
  );
}
