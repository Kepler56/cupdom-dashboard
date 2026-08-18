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
