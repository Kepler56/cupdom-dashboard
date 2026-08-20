import { BarChart3, Home, Megaphone } from 'lucide-react';
import { NavItem } from '@/components/molecules/NavItem';
import { Point } from '@/components/atoms/Point';

/**
 * Only routes that exist.
 *
 * « Contacts captés » (/contacts) and « Mon compte » (/compte) are STAGE 3C and
 * are restored there, with their Users and Settings icons. They are removed
 * rather than disabled because a dead link in a client-facing product is worse
 * than an absent one — the same principle LeadsPreview states for its missing
 * export link, in this same branch.
 *
 * The removal became necessary when /campagnes shipped. All three lower items
 * were dead before, which reads as a product still being built; two dead beside
 * one that works reads as a product that is broken. Either way the sponsor
 * landed on a 404, and this branch's own e2e suite documents that a portal 404
 * is a screen we control, not a place to send people on purpose.
 */
export const NAV = [
  { href: '/', label: "Vue d'ensemble", icon: Home },
  { href: '/audience', label: 'Audience', icon: BarChart3 },
  { href: '/campagnes', label: 'Campagnes', icon: Megaphone },
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
