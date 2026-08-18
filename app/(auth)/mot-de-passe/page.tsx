import { PasswordForm } from '@/components/auth/PasswordForm';

export const metadata = { title: 'Nouveau mot de passe — Portail client CUPDOM' };

export default function PasswordPage() {
  return (
    <>
      <h1 className="font-display mb-1 text-2xl font-bold text-ink">Choisissez votre mot de passe.</h1>
      <p className="mb-6 text-sm text-text-muted">
        Celui qu&apos;on vous a envoyé était provisoire. Remplacez-le pour continuer.
      </p>
      <PasswordForm />
    </>
  );
}
