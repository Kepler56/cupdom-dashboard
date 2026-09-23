import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getClientAccount, isCupdomMember } from '@/lib/session';
import { resolveRedirect } from '@/lib/auth/routes';
import { Sidebar } from '@/components/organisms/Sidebar';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // Both memoised per request, so the pages pay nothing to read them again.
  const [account, member] = await Promise.all([getClientAccount(), isCupdomMember()]);
  const hdrs = await headers();
  const pathname = hdrs.get('x-pathname') ?? '/';
  // The admin-selected client (#4), forwarded by middleware, so the Sidebar keeps
  // ?client on its section links.
  const client = hdrs.get('x-client');

  // The account gate lives here rather than in middleware: middleware runs on
  // every request including assets, and this is a database round-trip.
  // Security is RLS + the RPC guards; this is for correct routing.
  const destination = resolveRedirect(
    {
      signedIn: true, // middleware already bounced anonymous requests
      hasActiveAccount: account !== null,
      mustChangePassword: account?.mustChangePassword ?? false,
      // A Cupdom member (#4) has no client_accounts row but may enter the portal
      // to view clients through the picker.
      isMember: member,
    },
    pathname,
  );
  if (destination) redirect(destination);

  return (
    <div className="flex min-h-dvh">
      {/* Below `lg` the 240 px column becomes the drawer in TopBar's MobileNav. */}
      <div className="hidden lg:flex">
        <Sidebar pathname={pathname} client={client} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
