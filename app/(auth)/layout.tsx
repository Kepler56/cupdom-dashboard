import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Point } from '@/components/atoms/Point';
import { createServerClient } from '@/lib/supabase/server';
import { getClientAccount } from '@/lib/session';
import { LOGIN_ROUTE, resolveRedirect } from '@/lib/auth/routes';

/**
 * The auth pages carry the same routing gate as the portal.
 *
 * WHY IT IS HERE: resolveRedirect() already returns HOME_ROUTE for /login and
 * /mot-de-passe once a client is fully authenticated (routes.ts rule 4), and a unit
 * test has always covered that branch. But the only caller was (portal)/layout.tsx,
 * and neither of those two paths lives in the (portal) group — so the rule was never
 * executed against a real request. A signed-in client who opened /login simply stayed
 * there. Green test, dead code path. TRA/POR-A10.
 *
 * Nothing is exposed by that bug — the boundary is RLS and the RPC guards — so this is
 * routing correctness, not a security fix.
 *
 * Unlike the portal layout this cannot assume a session: /login is the one public
 * route, so middleware lets anonymous requests through and `signedIn` has to be
 * resolved here. getClientAccount() is skipped entirely when there is no user, so an
 * anonymous login page still costs zero database round-trips.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Same header the portal layout reads; middleware forwards it on every request.
  const pathname = (await headers()).get('x-pathname') ?? LOGIN_ROUTE;
  const account = user ? await getClientAccount() : null;

  const destination = resolveRedirect(
    {
      signedIn: user !== null,
      hasActiveAccount: account !== null,
      mustChangePassword: account?.mustChangePassword ?? false,
    },
    pathname,
  );
  if (destination) redirect(destination);

  return (
    <main className="trame-point flex min-h-dvh items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-baseline gap-1.5">
          <span className="font-display text-2xl font-extrabold text-ink sm:text-3xl">CUPDOM</span>
          <span className="text-ink"><Point size={10} /></span>
        </div>
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-6">{children}</div>
      </div>
    </main>
  );
}
