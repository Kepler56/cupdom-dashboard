'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { sortParam, type LeadsQuery, type SortKey } from '@/lib/analytics/leadsQuery';

/**
 * A column header that sorts. A Link, not a button, for the same reason the
 * period pills are: what it changes is what gets FETCHED, so it belongs in the
 * URL — shareable, bookmarkable, server-rendered, no client state to fall out of
 * sync.
 *
 * `aria-sort` on the `<th>` is not decoration: without it a screen-reader user
 * hears four identical column links and cannot tell which one the table is
 * currently ordered by, or which way.
 */
export function SortableHeader({
  label,
  sort,
  query,
}: {
  label: string;
  sort: SortKey;
  query: LeadsQuery;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  const active = query.sort === sort;
  // A new column starts ascending — A→Z and oldest-first are what a reader
  // expects from a first click. An active column reverses.
  const next = active && query.dir === 'asc' ? 'desc' : 'asc';

  const href = () => {
    const p = new URLSearchParams(params.toString());
    p.set('tri', sortParam(sort, next));
    // Re-sorting reorders the whole result set, so page 7 means nothing
    // afterwards. Dropping it returns the reader to the top.
    p.delete('page');
    return `${pathname}?${p.toString()}`;
  };

  const Icon = !active ? ChevronsUpDown : query.dir === 'asc' ? ArrowUp : ArrowDown;

  return (
    <th
      scope="col"
      aria-sort={!active ? 'none' : query.dir === 'asc' ? 'ascending' : 'descending'}
      className="pb-2 pr-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted"
    >
      <Link href={href()} className="inline-flex items-center gap-1 hover:text-text">
        {label}
        <Icon size={13} aria-hidden="true" className={active ? 'text-ink' : 'opacity-40'} />
      </Link>
    </th>
  );
}
