import { cookies } from 'next/headers';
import { createServerClient as createSsrServerClient } from '@supabase/ssr';

/**
 * Server Component / Route Handler client. Reads the session from cookies, so
 * Postgres sees the client's own JWT and RLS applies to every query.
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  return createSsrServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // The middleware refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}

/**
 * The real client type — used wherever a function needs to accept it as a
 * parameter.
 *
 * Do not replace this with a hand-rolled structural type like
 * `{ rpc: (fn: string, args?: ...) => Promise<{ data; error }> }`. `rpc()`
 * actually returns a `PostgrestFilterBuilder`, which is a thenable — it has
 * `.then` — but is not a full `Promise`, so a structural type fails to
 * type-check against it. It also erases `error` to `unknown`, which is what
 * forces an `as never` cast to satisfy `classifyPostgrestError` downstream.
 * Using the real type avoids both problems: no cast is needed anywhere.
 */
export type SupabaseServerClient = Awaited<ReturnType<typeof createServerClient>>;
