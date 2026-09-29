'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/organisms/Sidebar';

/**
 * The desktop rail, driven by the BROWSER's url.
 *
 * The portal layout used to pass `x-pathname` from the request headers. App
 * Router layouts are not re-rendered on client-side <Link> navigation, so that
 * value froze at the first page loaded and « Vue d’ensemble » stayed lit on
 * every section. MobileNav already read usePathname(); this makes the desktop
 * rail do the same. Sidebar itself stays presentational.
 */
export function SidebarNav() {
  const pathname = usePathname() ?? '/';
  const client = useSearchParams().get('client');
  return <Sidebar pathname={pathname} client={client} />;
}
