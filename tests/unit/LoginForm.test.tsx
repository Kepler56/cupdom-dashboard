import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LoginForm } from '@/components/auth/LoginForm';

const signInWithPassword = vi.fn();

/**
 * The rpc mock is BUILDER-SHAPED, not a resolved promise, and that is the whole
 * point of it.
 *
 * postgrest-js's PostgrestBuilder is a lazy thenable: the fetch is inside
 * `then()` (dist/index.mjs — `executeWithRetry` is created and awaited there).
 * A `vi.fn().mockResolvedValue(...)` mock therefore cannot distinguish
 * `supabase.rpc('x')` from `supabase.rpc('x').then(...)` — the first builds a
 * query and sends NOTHING, and both satisfy `toHaveBeenCalledWith`. Mirroring
 * the laziness here means `sent` flips only when the caller does the one thing
 * that puts an HTTP request on the wire.
 */
let sent = false;

function builder() {
  return {
    then(
      onFulfilled?: (value: { data: null; error: null }) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      sent = true;
      return Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected);
    },
  };
}

const rpc = vi.fn(builder);
const resetPasswordForEmail = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => ({ auth: { signInWithPassword, resetPasswordForEmail }, rpc }),
}));
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh: vi.fn() }) }));

beforeEach(() => {
  signInWithPassword.mockReset();
  resetPasswordForEmail.mockReset();
  resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  rpc.mockReset();
  rpc.mockImplementation(builder);
  replace.mockReset();
  sent = false;
});

describe('LoginForm', () => {
  it('labels its fields in French', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('Adresse e-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument();
  });

  it('shows a generic French error on bad credentials, never the raw Supabase message', () => {
    // The raw message leaks whether an address exists. One message for every
    // failure means a probe learns nothing.
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    return (async () => {
      render(<LoginForm />);
      await userEvent.type(screen.getByLabelText('Adresse e-mail'), 'a@b.fr');
      await userEvent.type(screen.getByLabelText('Mot de passe'), 'wrong');
      await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('E-mail ou mot de passe incorrect.');
      expect(alert).not.toHaveTextContent('Invalid login credentials');
    })();
  });

  it('redirects to the dashboard on success', async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText('Adresse e-mail'), 'a@b.fr');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'right');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('disables the button while the request is in flight', async () => {
    let resolve: (v: unknown) => void = () => {};
    signInWithPassword.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText('Adresse e-mail'), 'a@b.fr');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'x');
    await userEvent.click(screen.getByRole('button', { name: /Se connecter|Connexion/ }));
    // The form now also carries a « Mot de passe oublié ? » button, so target the
    // submit button by name rather than assuming it is the only one.
    expect(screen.getByRole('button', { name: /Se connecter|Connexion/ })).toBeDisabled();
    resolve({ error: null });
  });

  it('asks for an e-mail first when « Mot de passe oublié ? » is clicked empty', async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Mot de passe oublié ?' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Saisissez d’abord votre adresse e-mail.');
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('sends a reset e-mail and shows a NEUTRAL notice that never confirms the address exists', async () => {
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText('Adresse e-mail'), 'client@example.test');
    await userEvent.click(screen.getByRole('button', { name: 'Mot de passe oublié ?' }));

    await waitFor(() =>
      expect(resetPasswordForEmail).toHaveBeenCalledWith(
        'client@example.test',
        expect.objectContaining({ redirectTo: expect.stringContaining('/reinitialiser') }),
      ),
    );
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Si un compte existe');
    // The notice must not leak that the address is (or is not) a real account.
    expect(status).not.toHaveTextContent('client@example.test');
  });

  it('actually SENDS client_mark_login after a successful sign-in, not just builds it', async () => {
    // Two assertions, and the second is the one that matters. `rpc` having been
    // called proves only that a query object was constructed; `sent` proves the
    // builder was awaited, which is what puts the request on the wire. Against
    // a bare `void supabase.rpc('client_mark_login')` the first passes and the
    // second fails — which is exactly the bug this test exists to catch.
    signInWithPassword.mockResolvedValue({ error: null });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText('Adresse e-mail'), 'client@example.test');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'un-mot-de-passe');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    await waitFor(() => expect(rpc).toHaveBeenCalledWith('client_mark_login'));
    expect(sent).toBe(true);
  });
});
