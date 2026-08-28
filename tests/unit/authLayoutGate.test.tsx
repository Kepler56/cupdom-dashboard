import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getClientAccount } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';
import AuthLayout from '@/app/(auth)/layout';

/**
 * POR-A10. resolveRedirect() has always returned HOME_ROUTE for /login and
 * /mot-de-passe once a client is fully authenticated, and authRoutes.test.ts has
 * always covered that branch — but the only caller was (portal)/layout.tsx, and
 * neither path lives in the (portal) group. The rule was never run against a real
 * request, so a signed-in client opening /login just stayed there.
 *
 * These tests exercise the CALL SITE, which is the half that was missing. Testing
 * the pure function again would reproduce exactly the blind spot that let this ship.
 */
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('next/headers', () => ({ headers: vi.fn() }));
vi.mock('@/lib/session', () => ({ getClientAccount: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));

function onPath(pathname: string) {
  (headers as Mock).mockResolvedValue({ get: () => pathname });
}
function signedInAs(user: { id: string } | null) {
  (createServerClient as Mock).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user } }) },
  });
}

describe('(auth) layout routing gate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends a settled client away from /login', async () => {
    signedInAs({ id: 'u1' });
    (getClientAccount as Mock).mockResolvedValue({ mustChangePassword: false });
    onPath('/login');

    await AuthLayout({ children: null });

    expect(redirect).toHaveBeenCalledWith('/');
  });

  it('sends a settled client away from /mot-de-passe', async () => {
    signedInAs({ id: 'u1' });
    (getClientAccount as Mock).mockResolvedValue({ mustChangePassword: false });
    onPath('/mot-de-passe');

    await AuthLayout({ children: null });

    expect(redirect).toHaveBeenCalledWith('/');
  });

  it('leaves an anonymous visitor on /login, without touching the database', async () => {
    signedInAs(null);
    onPath('/login');

    await AuthLayout({ children: null });

    expect(redirect).not.toHaveBeenCalled();
    expect(getClientAccount).not.toHaveBeenCalled();
  });

  it('keeps a client with a temporary password on /mot-de-passe', async () => {
    signedInAs({ id: 'u1' });
    (getClientAccount as Mock).mockResolvedValue({ mustChangePassword: true });
    onPath('/mot-de-passe');

    await AuthLayout({ children: null });

    expect(redirect).not.toHaveBeenCalled();
  });

  it('still shows /login to a signed-in user who has no portal account', async () => {
    signedInAs({ id: 'crm-member' });
    (getClientAccount as Mock).mockResolvedValue(null);
    onPath('/login');

    await AuthLayout({ children: null });

    // Not redirected: the page has to render to explain why access was refused.
    expect(redirect).not.toHaveBeenCalled();
  });
});
