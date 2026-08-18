import { getClientAccount } from '@/lib/session';
import { TopBar } from '@/components/organisms/TopBar';
import { parsePeriod } from '@/lib/period';
import { Point } from '@/components/atoms/Point';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const account = await getClientAccount();
  const period = parsePeriod((await searchParams).p);

  return (
    <>
      <TopBar company={account?.displayName ?? 'Votre compte'} period={period} />
      <main className="trame-point flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <span className="text-signal"><Point size={28} /></span>
        <h1 className="font-display text-2xl font-bold text-ink">
          Bonjour, {account?.displayName ?? ''}.
        </h1>
        <p className="text-sm text-text-muted">Vos statistiques arrivent ici.</p>
      </main>
    </>
  );
}
