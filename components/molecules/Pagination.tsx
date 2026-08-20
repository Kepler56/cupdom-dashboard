'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { formatNumber } from '@/lib/analytics/format';

/**
 * Prev / next over `?page=`, with the filtered total stated in words.
 *
 * The total is the point, not the arrows: a sponsor needs to know whether they
 * are looking at 40 contacts or 4 000 before they judge a campaign, and the page
 * itself only ever shows fifty.
 *
 * Renders nothing on a single page — a « Page 1 sur 1 » with two dead arrows is
 * furniture.
 */
export function Pagination({ page, pages, total }: { page: number; pages: number; total: number }) {
  const pathname = usePathname();
  const params = useSearchParams();

  if (pages <= 1) return null;

  const hrefFor = (target: number) => {
    const p = new URLSearchParams(params.toString());
    if (target <= 1) p.delete('page');
    else p.set('page', String(target));
    return `${pathname}?${p.toString()}`;
  };

  const pill = 'rounded-[var(--radius-pill)] border border-border px-3 py-1.5 text-sm hover:bg-canvas';

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 pt-4">
      {/* Two separate spans, each a single JS expression rather than several
          interpolated text nodes: an exact-string query on "Page X sur Y" must
          not also have to swallow the total that follows it, and a regex query
          on the total must not accidentally match "Page X sur Y" too. */}
      <p className="text-sm text-text-muted">
        <span>{`Page ${page} sur ${pages}`}</span>{' · '}
        <span>{`${formatNumber(total)} contact${total > 1 ? 's' : ''}`}</span>
      </p>
      <div className="flex items-center gap-2">
        {page > 1 && (
          <Link href={hrefFor(page - 1)} className={pill}>
            Précédent
          </Link>
        )}
        {page < pages && (
          <Link href={hrefFor(page + 1)} className={pill}>
            Suivant
          </Link>
        )}
      </div>
    </nav>
  );
}
