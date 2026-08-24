'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Sidebar } from '@/components/organisms/Sidebar';

/**
 * The portal's navigation below `lg`, where the 240 px sidebar would eat most
 * of a phone screen with no way to dismiss it.
 *
 * It renders the SAME `Sidebar` as the desktop column rather than a second nav
 * list: the sidebar's entries are checked against the filesystem by
 * tests/unit/Sidebar.test.tsx precisely because a dead link in a client-facing
 * product is worse than an absent one, and a duplicated list would drift out
 * from under that guarantee.
 *
 * Lives inside `TopBar`, so it inherits a header that is on every portal page.
 */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close on navigation: the drawer is fixed-position, so without this it stays
  // over the page the client just asked for.
  useEffect(() => setOpen(false), [pathname]);

  // Escape closes, and the page behind must not scroll under the overlay —
  // on iOS a scrollable body under a fixed drawer is how you lose your place.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        aria-controls="portal-mobile-nav"
        className="-ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-pill)] text-ink transition-colors hover:bg-ink/5 lg:hidden"
      >
        <Menu size={22} strokeWidth={1.75} aria-hidden="true" />
      </button>

      {open && (
        <div id="portal-mobile-nav" className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex max-w-[85vw] shadow-xl">
            <Sidebar pathname={pathname} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer le menu"
              className="absolute right-0 top-2 inline-flex h-11 w-11 translate-x-full items-center justify-center text-white"
            >
              <X size={22} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
