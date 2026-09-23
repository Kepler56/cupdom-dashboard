import { EmptyState } from '@/components/molecules/EmptyState';

/**
 * What a Cupdom member sees before they pick a client (#4). Every portal page
 * renders this instead of calling its fetcher when no client is selected —
 * client_campaigns(null) would otherwise raise for a member and paint the
 * alarming « Accès refusé » screen. A real client never sees this.
 */
export function ChooseClient() {
  return (
    <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
      <EmptyState title="Choisissez un client">
        Sélectionnez un client dans le menu en haut pour afficher son tableau de bord.
      </EmptyState>
    </main>
  );
}
