'use client';

import { createBrowserClient as createSsrBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client. Anon key only — this repository never holds a
 * service-role key. Every read it performs is gated by Postgres RLS.
 */
export function createBrowserClient() {
  return createSsrBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
