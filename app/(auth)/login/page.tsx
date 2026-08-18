import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = { title: 'Connexion — Portail client CUPDOM' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  // Set by resolveRedirect when a signed-in user has no active portal account
  // (a CRM member, or a deactivated client). Saying so is the point — a silent
  // bounce back to login looks like a broken app (spec §5.8, §6).
  const noAccess = (await searchParams).erreur === 'acces';

  return (
    <>
      <h1 className="font-display mb-1 text-2xl font-bold text-ink">Votre portail.</h1>
      <p className="mb-6 text-sm text-text-muted">Vos campagnes, vos scans, vos contacts.</p>
      {noAccess && (
        <p role="alert" className="mb-4 rounded-[var(--radius-card)] bg-[#FFFAEB] px-4 py-3 text-sm text-[#B54708]">
          Ce compte n&apos;a pas accès au portail client.
        </p>
      )}
      <LoginForm signOutFirst={noAccess} />
    </>
  );
}
