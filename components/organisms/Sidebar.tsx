import { BarChart3, Home, Megaphone, Users } from 'lucide-react';
import { NavItem } from '@/components/molecules/NavItem';
import { Point } from '@/components/atoms/Point';

/**
 * Only routes that exist.
 *
 * « Mon compte » (/compte) is STAGE 4 and is restored there, with its Settings
 * icon. It stays out rather than being disabled because a dead link in a
 * client-facing product is worse than an absent one — the same principle
 * LeadsPreview states for its missing export link.
 *
 * « Contacts captés » was removed alongside it in stage 3B and is restored here,
 * now that the route exists.
 */
export const NAV = [
  { href: '/', label: "Vue d'ensemble", icon: Home },
  { href: '/audience', label: 'Audience', icon: BarChart3 },
  { href: '/campagnes', label: 'Campagnes', icon: Megaphone },
  { href: '/contacts', label: 'Contacts captés', icon: Users },
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
