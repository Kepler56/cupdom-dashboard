import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the auth session and returns both the response (carrying updated
 * cookies) and whether a user is signed in. Deliberately does NOT query
 * client_accounts — that would be a database round-trip on every asset request.
 * The portal layout resolves the account instead (spec §5.8).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getUser() revalidates against the auth server; getSession() would trust
  // the cookie, which is not good enough for a routing decision.
  const { data } = await supabase.auth.getUser();

  return { response, signedIn: data.user !== null };
}
