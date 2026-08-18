import { BarChart3, Home, Megaphone, Settings, Users } from 'lucide-react';
import { NavItem } from '@/components/molecules/NavItem';
import { Point } from '@/components/atoms/Point';

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
