import { AccessDenied } from '@/components/molecules/AccessDenied';
import { ErrorState } from '@/components/molecules/ErrorState';
import { CampaignsTable } from '@/components/organisms/CampaignsTable';
import { TopBar } from '@/components/organisms/TopBar';
import { fetchCampaigns } from '@/lib/data/campaigns';
import { parsePeriod, resolvePeriod } from '@/lib/period';
import { getClientAccount } from '@/lib/session';

export default async function CampagnesPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const account = await getClientAccount();
  const params = await searchParams;
  const period = parsePeriod(params.p);
  const range = resolvePeriod(period, new Date());
  const result = await fetchCampaigns({ range });
  const company = account?.displayName ?? 'Votre compte';

  if (!result.ok) {
    return (
      <>
        <TopBar company={company} period={period} campaigns={[]} campaign={null} showCampaignFilter={false} />
        <main className="flex flex-1 items-center justify-center p-6">
          {result.failure.kind === 'refused' ? <AccessDenied /> : <ErrorState message={result.failure.message} />}
        </main>
      </>
    );
  }

  const { campaigns, sparklines } = result.data;
  const active = campaigns.filter((c) => c.active).length;

  return (
    <>
      <TopBar company={company} period={period} campaigns={[]} campaign={null} showCampaignFilter={false} />

      <main className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Campagnes</h1>
          <p className="mt-1 text-sm text-text-muted">
            {campaigns.length === 0
              ? 'Les robots sont exclus de tous les chiffres.'
              : `${active} active${active > 1 ? 's' : ''} sur ${campaigns.length}. Les plus récentes d’abord. Les robots sont exclus de tous les chiffres.`}
          </p>
        </div>

        <CampaignsTable campaigns={campaigns} sparklines={sparklines} title="Toutes vos campagnes" />
      </main>
    </>
  );
}
