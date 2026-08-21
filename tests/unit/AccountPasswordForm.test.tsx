import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountPasswordForm } from '@/components/auth/AccountPasswordForm';

const signInWithPassword = vi.fn();
const updateUser = vi.fn();
const rpc = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => ({ auth: { signInWithPassword, updateUser }, rpc }),
}));

beforeEach(() => {
  signInWithPassword.mockReset().mockResolvedValue({ error: null });
  updateUser.mockReset().mockResolvedValue({ error: null });
  rpc.mockReset();
});

const EMAIL = 'sponsor@example.test';

async function fill(current: string, next: string, confirm: string) {
  await userEvent.type(screen.getByLabelText('Mot de passe actuel'), current);
  await userEvent.type(screen.getByLabelText('Nouveau mot de passe'), next);
  await userEvent.type(screen.getByLabelText('Confirmer le nouveau mot de passe'), confirm);
  await userEvent.click(screen.getByRole('button', { name: 'Changer le mot de passe' }));
}

describe('AccountPasswordForm', () => {
  it('refuses a password under 10 characters without calling Supabase', async () => {
    render(<AccountPasswordForm email={EMAIL} />);
    await fill('actuel-valide', 'court', 'court');
    expect(await screen.findByRole('alert')).toHaveTextContent('au moins 10 caractères');
    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('refuses mismatched confirmations without calling Supabase', async () => {
    render(<AccountPasswordForm email={EMAIL} />);
    await fill('actuel-valide', 'motdepasse-valide', 'autre-mot-de-passe');
    expect(await screen.findByRole('alert')).toHaveTextContent('ne correspondent pas');
    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('NEVER changes the password when the current one is wrong', async () => {
    // The assertion this component exists for.
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    render(<AccountPasswordForm email={EMAIL} />);
    await fill('mauvais-mot-de-passe', 'motdepasse-valide', 'motdepasse-valide');

    expect(await screen.findByRole('alert')).toHaveTextContent('actuel est incorrect');
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('proves identity BEFORE changing anything, using the signed-in address', async () => {
    render(<AccountPasswordForm email={EMAIL} />);
    await fill('actuel-valide', 'motdepasse-valide', 'motdepasse-valide');

    expect(signInWithPassword).toHaveBeenCalledWith({ email: EMAIL, password: 'actuel-valide' });
    expect(updateUser).toHaveBeenCalledWith({ password: 'motdepasse-valide' });
    expect(signInWithPassword.mock.invocationCallOrder[0]).toBeLessThan(updateUser.mock.invocationCallOrder[0]);
  });

  it('confirms in place, and does not touch the forced-change flag', async () => {
    render(<AccountPasswordForm email={EMAIL} />);
    await fill('actuel-valide', 'motdepasse-valide', 'motdepasse-valide');

    expect(await screen.findByRole('status')).toHaveTextContent('Votre mot de passe a été changé');
    // client_mark_password_changed belongs to the FORCED flow. Calling it here
    // would be a no-op today and a lie in the ledger.
    expect(rpc).not.toHaveBeenCalled();
  });

  it('reports a failed update in French, without echoing anything the user typed', async () => {
    updateUser.mockResolvedValue({ error: { message: 'Password should be at least 6 characters' } });
    render(<AccountPasswordForm email={EMAIL} />);
    await fill('actuel-valide', 'motdepasse-valide', 'motdepasse-valide');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Impossible');
    expect(alert.textContent).not.toContain('motdepasse-valide');
    expect(alert.textContent).not.toContain('Password should be');
  });
});
