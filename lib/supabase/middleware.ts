import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the auth session and returns both the response (carrying updated
 * cookies) and whether a user is signed in. Deliberately does NOT query
 * client_accounts — that would be a database round-trip on every asset request.
 * The portal layout resolves the account instead (spec §5.8).
 *
 * `extraRequestHeaders` are forwarded to the downstream render as REQUEST
 * headers, which is the only channel a Server Component's `headers()` can read.
 * Setting them on the RESPONSE instead would be silently inert — see the note
 * on x-pathname in middleware.ts.
 */
export async function updateSession(
  request: NextRequest,
  extraRequestHeaders: Record<string, string> = {},
) {
  // Rebuilt at each NextResponse.next() call rather than captured once: the
  // cookie handler below mutates request.cookies, and that mutation must be
  // reflected in the forwarded `cookie` header.
  const buildRequestHeaders = () => {
    const headers = new Headers(request.headers);
    for (const [name, value] of Object.entries(extraRequestHeaders)) {
      headers.set(name, value);
    }
    return headers;
  };

  let response = NextResponse.next({ request: { headers: buildRequestHeaders() } });

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
          response = NextResponse.next({ request: { headers: buildRequestHeaders() } });
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
