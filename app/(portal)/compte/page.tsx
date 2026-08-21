import { AccountPasswordForm } from '@/components/auth/AccountPasswordForm';
import { Card } from '@/components/atoms/Card';
import { AccessDenied } from '@/components/molecules/AccessDenied';
import { ConsentPanel } from '@/components/organisms/ConsentPanel';
import { TopBar } from '@/components/organisms/TopBar';
import { loadConsents } from '@/lib/data/consent';
import { parsePeriod } from '@/lib/period';
import { getClientAccount } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';

export const metadata = { title: 'Mon compte — Portail client CUPDOM' };

/**
 * « Mon compte » — spec §4.3-E.
 *
 * Three sections, one of which is new code. The details are READ-ONLY and that
 * is structural rather than a product decision: `client_accounts` carries no
 * client UPDATE policy, which is also why the forced-change flow clears its
 * flag through an RPC instead of an update. Rendering an editable field here
 * would produce a form that silently fails against RLS.
 *
 * The consent copy is the same component the Contacts page uses, reading the
 * same recorded evidence. Spec §4.3-E asks for « a copy of the consent text
 * applied to their leads » and §4.4 makes that the recorded wording, not a
 * reconstruction — so this is one component in two places, not two statements
 * that could drift.
 */
export default async function ComptePage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const supabase = await createServerClient();
  const account = await getClientAccount();
  const params = await searchParams;
  const period = parsePeriod(params.p);

  // The layout already rejects a caller with no active client_accounts row, so
  // this is belt and braces — but rendering a page about "your account" for
  // someone who has none would be worse than the extra branch.
  if (!account) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <AccessDenied />
      </main>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  // signInWithPassword authenticates against the AUTH user's address, not the
  // client_accounts copy. They are written together at provisioning and nothing
  // in the portal changes either — but if they ever diverged, this form would
  // reject a correct password with « mot de passe actuel incorrect », which is
  // undiagnosable from the message. So this is also the address shown in « Vos
  // informations » below, not account.email: it is the one that actually
  // determines whether a sign-in succeeds, whereas the account row is
  // provisioning metadata that can go stale and has no operational meaning to
  // the sponsor reading this page.
  const authEmail = user?.email ?? account.email;

  const consents = await loadConsents(supabase);

  return (
    <>
      <TopBar company={account.displayName ?? 'Votre compte'} period={period} campaigns={[]} campaign={null} />

      <main className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Mon compte</h1>
          <p className="mt-1 text-sm text-text-muted">Vos identifiants et la base légale de vos contacts.</p>
        </div>

        <Card title="Vos informations">
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex flex-wrap gap-x-3">
              <dt className="w-40 shrink-0 text-text-muted">Nom affiché</dt>
              <dd className="text-text-body">{account.displayName ?? '—'}</dd>
            </div>
            <div className="flex flex-wrap gap-x-3">
              <dt className="w-40 shrink-0 text-text-muted">Adresse e-mail</dt>
              <dd className="text-text-body">{authEmail}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-text-muted">
            Pour corriger ces informations, écrivez à votre contact Cupdom — elles sont gérées de notre côté.
          </p>
        </Card>

        <Card title="Mot de passe" subtitle="Choisissez-en un nouveau quand vous voulez">
          <AccountPasswordForm email={authEmail} />
        </Card>

        <ConsentPanel consents={consents} />
      </main>
    </>
  );
}
