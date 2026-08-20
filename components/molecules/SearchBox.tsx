'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

/** Long enough that a typist is not re-querying per keystroke, short enough to feel live. */
const DEBOUNCE_MS = 300;

/**
 * Search over name and e-mail.
 *
 * Local state for what is typed, the URL for what is searched — the input must
 * stay responsive between keystrokes, but the query itself belongs in the URL
 * like every other filter in this portal.
 *
 * `replace`, not `push`: thirty keystrokes should not put thirty entries in the
 * back button.
 */
export function SearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(initial);
  // Skip the push on mount, which would otherwise rewrite the URL on every load.
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const timer = setTimeout(() => {
      const p = new URLSearchParams(params.toString());
      if (value.trim()) p.set('q', value.trim());
      else p.delete('q');
      // A new search reorders nothing but re-filters everything, so page 7 of
      // the old result set is meaningless — and an empty page 7 reads as « no
      // matches » when there are matches.
      p.delete('page');
      router.replace(`${pathname}?${p.toString()}`);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Rechercher un contact par nom ou e-mail</span>
      <Search size={15} aria-hidden="true" className="absolute left-3 text-text-muted" />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Nom ou e-mail…"
        className="w-64 rounded-[var(--radius-pill)] border border-border bg-surface py-1.5 pl-9 pr-3 text-sm text-text outline-none focus:border-ink"
      />
    </label>
  );
}
