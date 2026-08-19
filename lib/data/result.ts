export type Failure = { kind: 'refused' } | { kind: 'error'; message: string };

export type DataResult<T> = { ok: true; data: T } | { ok: false; failure: Failure };

/** SQLSTATE insufficient_privilege — what public.client_guard() raises. */
const INSUFFICIENT_PRIVILEGE = '42501';

export const GENERIC_ERROR_FR = 'Impossible de charger vos données pour le moment.';

/**
 * A Postgres error becomes a UI decision here, and there are exactly two:
 *
 * - 'refused' — the caller is not a portal client, or named a campaign that is
 *   not theirs. Spec §6: render « Accès refusé » and clear the session. Never
 *   degrade to an empty dashboard; "you have no access" and "you have no data"
 *   must not look alike.
 * - 'error' — everything else, carrying a fixed French message. The raw
 *   Supabase text never reaches the page: it is English and it leaks schema.
 */
export function classifyPostgrestError(
  error: { code?: string | null; message?: string | null } | null | undefined,
): Failure {
  if (error?.code === INSUFFICIENT_PRIVILEGE) return { kind: 'refused' };
  // Defence in depth: if the code is ever lost in transit, the guard's own
  // message still identifies a refusal.
  if (error?.message?.includes('accès refusé')) return { kind: 'refused' };
  return { kind: 'error', message: GENERIC_ERROR_FR };
}
