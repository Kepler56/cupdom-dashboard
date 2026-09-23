'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export interface ClientPickerOption {
  contactId: string;
  label: string;
}

/**
 * The admin-only client picker (#4). It sits above the campaign filter and lets
 * a Cupdom member choose whose dashboard to view. Written to the URL (`?client=`)
 * like the campaign filter, so the view is server-rendered and shareable.
 *
 * A real client never receives this — the pages render it only when the viewer
 * is a member. It renders nothing when there are no clients to pick.
 */
export function ClientFilter({ clients, current }: { clients: ClientPickerOption[]; current: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (clients.length === 0) return null;

  function onChange(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set('client', value);
    else next.delete('client');
    // A campaign slug belongs to ONE client, so carrying `?c=` across a client
    // switch would point at a campaign the new client does not own — the RPC
    // would refuse it. Clear it on every client change.
    next.delete('c');
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <label className="inline-flex shrink-0 items-center gap-2">
      <span className="sr-only">Client</span>
      <select
        value={current ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className="max-w-[60vw] truncate rounded-[var(--radius-pill)] border border-signal bg-surface px-3 py-2 text-base font-medium text-ink outline-none focus:border-ink sm:max-w-none sm:py-1.5 sm:text-sm"
      >
        <option value="">— Choisir un client —</option>
        {clients.map((client) => (
          <option key={client.contactId} value={client.contactId}>
            {client.label}
          </option>
        ))}
      </select>
    </label>
  );
}
