import { BarChart3, Home, Megaphone, Settings, Users } from 'lucide-react';
import { NavItem } from '@/components/molecules/NavItem';
import { Point } from '@/components/atoms/Point';

/**
 * Only routes that exist.
 *
 * Every entry here is checked against the filesystem by
 * tests/unit/Sidebar.test.tsx, because a dead link in a client-facing product
 * is worse than an absent one and the sidebar is on every portal page — one
 * stale href sends a paying sponsor to a 404 from anywhere in the product.
 * « Contacts captés » and « Mon compte » were both out of this list for two
 * stages for exactly that reason, and both are here now because their screens
 * are.
 */
export const NAV = [
  { href: '/', label: "Vue d'ensemble", icon: Home },
  { href: '/audience', label: 'Audience', icon: BarChart3 },
  { href: '/campagnes', label: 'Campagnes', icon: Megaphone },
  { href: '/contacts', label: 'Contacts captés', icon: Users },
  { href: '/compte', label: 'Mon compte', icon: Settings },
];

export function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="flex w-60 shrink-0 flex-col bg-ink p-4">
      <div className="mb-8 flex items-baseline gap-1.5 px-3 pt-2">
        <span className="font-display text-xl font-extrabold text-white">CUPDOM</span>
        <span className="text-signal"><Point size={7} /></span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)}
          />
        ))}
      </nav>
    </aside>
  );
}
