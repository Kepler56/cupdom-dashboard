import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Point } from '@/components/atoms/Point';

export function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={[
        'flex items-center gap-3 rounded-[var(--radius-pill)] px-3 py-2 text-sm transition-colors',
        active ? 'bg-white/10 font-medium text-white' : 'text-white/60 hover:text-white',
      ].join(' ')}
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
      <span className="flex-1">{label}</span>
      {/* Le point marque l'état actif — charte §07. */}
      {active && <span className="text-signal"><Point size={8} /></span>}
    </Link>
  );
}
