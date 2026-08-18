import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LoginForm } from '@/components/auth/LoginForm';

const signInWithPassword = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => ({ auth: { signInWithPassword } }),
}));
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh: vi.fn() }) }));

beforeEach(() => {
  signInWithPassword.mockReset();
  replace.mockReset();
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
    expect(screen.getByRole('button')).toBeDisabled();
    resolve({ error: null });
  });
});
