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
  // The URL already carries `initial`, so there is nothing to push until the
  // typed value diverges from it. A fired-once boolean does NOT work here:
  // reactStrictMode (on in this project) double-invokes effects in dev and
  // refs survive the simulated unmount, so the second invocation would sail
  // past a "have I mounted yet" flag and schedule a push with nothing typed —
  // silently dropping ?page= from a deep link. Comparing
  // against the last COMMITTED value is immune to that replay: both
  // invocations see the same `value === committed.current` and both skip.
  const committed = useRef(initial);

  useEffect(() => {
    if (value === committed.current) return;
    const timer = setTimeout(() => {
      committed.current = value;
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
