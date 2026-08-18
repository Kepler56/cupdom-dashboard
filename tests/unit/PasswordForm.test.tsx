import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PasswordForm } from '@/components/auth/PasswordForm';

const updateUser = vi.fn();
const rpc = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => ({ auth: { updateUser }, rpc }),
}));
const replace = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh }) }));

beforeEach(() => {
  updateUser.mockReset();
  rpc.mockReset();
  replace.mockReset();
});

describe('PasswordForm', () => {
  it('refuses a password under 10 characters, in French, without calling Supabase', async () => {
    render(<PasswordForm />);
    await userEvent.type(screen.getByLabelText('Nouveau mot de passe'), 'court');
    await userEvent.type(screen.getByLabelText('Confirmer le mot de passe'), 'court');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('au moins 10 caractères');
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('refuses mismatched confirmations without calling Supabase', async () => {
    render(<PasswordForm />);
    await userEvent.type(screen.getByLabelText('Nouveau mot de passe'), 'motdepasse-valide');
    await userEvent.type(screen.getByLabelText('Confirmer le mot de passe'), 'autre-mot-de-passe');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('ne correspondent pas');
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('clears must_change_password via RPC only AFTER the password actually changed', async () => {
    // Order matters: clearing the flag first would strand a client with a
    // temporary password and no forced-change screen to fix it.
    const calls: string[] = [];
    updateUser.mockImplementation(async () => { calls.push('updateUser'); return { error: null }; });
    rpc.mockImplementation(async () => { calls.push('rpc'); return { error: null }; });

    render(<PasswordForm />);
    await userEvent.type(screen.getByLabelText('Nouveau mot de passe'), 'motdepasse-valide');
    await userEvent.type(screen.getByLabelText('Confirmer le mot de passe'), 'motdepasse-valide');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(calls).toEqual(['updateUser', 'rpc']);
    expect(rpc).toHaveBeenCalledWith('client_mark_password_changed');
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('does NOT clear the flag when the password change failed', async () => {
    updateUser.mockResolvedValue({ error: { message: 'nope' } });
    render(<PasswordForm />);
    await userEvent.type(screen.getByLabelText('Nouveau mot de passe'), 'motdepasse-valide');
    await userEvent.type(screen.getByLabelText('Confirmer le mot de passe'), 'motdepasse-valide');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
