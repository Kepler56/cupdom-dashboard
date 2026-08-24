import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getClientAccount } from '@/lib/session';
import { resolveRedirect } from '@/lib/auth/routes';
import { Sidebar } from '@/components/organisms/Sidebar';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const account = await getClientAccount();
  const pathname = (await headers()).get('x-pathname') ?? '/';

  // The account gate lives here rather than in middleware: middleware runs on
  // every request including assets, and this is a database round-trip.
  // Security is RLS + the RPC guards; this is for correct routing.
  const destination = resolveRedirect(
    {
      signedIn: true, // middleware already bounced anonymous requests
      hasActiveAccount: account !== null,
      mustChangePassword: account?.mustChangePassword ?? false,
    },
    pathname,
  );
  if (destination) redirect(destination);

  return (
    <div className="flex min-h-dvh">
      {/* Below `lg` the 240 px column becomes the drawer in TopBar's MobileNav. */}
      <div className="hidden lg:flex">
        <Sidebar pathname={pathname} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
