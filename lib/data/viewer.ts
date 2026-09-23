import { getClientAccount, isCupdomMember } from '@/lib/session';
import { resolveTarget } from '@/lib/analytics/target';
import { fetchAdminClients, type AdminClientOption } from './adminClients';

export interface Viewer {
  /** One of the 3 Cupdom members (#4). */
  isMember: boolean;
  /**
   * The contact whose data to load, passed as p_target to every client_* RPC.
   * A real client is always null → the SQL falls back to their own contact.
   * A member is the picked client, or null when none is chosen yet.
   */
  target: string | null;
  /** Populated for members only; the picker renders nothing for a client. */
  clients: AdminClientOption[];
  /** The TopBar label: the client's / selected client's company. */
  company: string;
  /**
   * True only for a member who has not chosen a client yet. Pages render a
   * "choose a client" state instead of calling the fetchers — client_campaigns
   * (null) would otherwise raise for a member and paint « Accès refusé ».
   */
  needsClientChoice: boolean;
}

/**
 * Resolve who is viewing and, for a member, which client they have selected.
 *
 * One call per page keeps the member/target logic in a single place rather than
 * duplicated across six screens. getClientAccount and isCupdomMember are both
 * per-request memoised, so calling this alongside the page's own getClientAccount
 * costs no extra round-trips.
 */
export async function resolveViewer(rawClient: string | undefined): Promise<Viewer> {
  const [account, member] = await Promise.all([getClientAccount(), isCupdomMember()]);

  if (!member) {
    return {
      isMember: false,
      target: null,
      clients: [],
      company: account?.displayName ?? 'Votre compte',
      needsClientChoice: false,
    };
  }

  const clients = await fetchAdminClients();
  const target = resolveTarget(rawClient, true, clients.map((c) => c.contactId));
  const selected = clients.find((c) => c.contactId === target);

  return {
    isMember: true,
    target,
    clients,
    company: selected?.label ?? 'Choisir un client',
    needsClientChoice: target === null,
  };
}
