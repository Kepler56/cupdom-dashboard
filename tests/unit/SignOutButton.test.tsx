import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SignOutButton } from '@/components/molecules/SignOutButton';

const signOut = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => ({ auth: { signOut } }),
}));

// window.location.assign is what carries the user away; jsdom's is not spyable
// in place, so replace it with a stub for the duration of the suite.
const assign = vi.fn();

beforeEach(() => {
  signOut.mockReset();
  signOut.mockResolvedValue({ error: null });
  assign.mockReset();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { assign },
  });
});

describe('SignOutButton', () => {
  it('is labelled in French', () => {
    render(<SignOutButton />);
    expect(screen.getByRole('button', { name: 'Se déconnecter' })).toBeInTheDocument();
  });

  it('ends the Supabase session and then sends the user to /login', async () => {
    render(<SignOutButton />);
    await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    expect(signOut).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/login'));
  });

  it('still redirects to /login when signOut rejects, rather than stranding the user', async () => {
    // Offline, or an already-expired token: the session is dead either way and
    // the middleware re-checks it at /login, so leaving them on a half-signed-out
    // page is the worse outcome.
    signOut.mockRejectedValue(new Error('network'));
    render(<SignOutButton />);
    await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/login'));
  });
});
