import type { CampaignRow } from './types';

/**
 * PURE. Validate the `?c=` parameter against the campaigns the caller owns.
 *
 * Deliberately forgiving. Handing an unowned slug to an RPC raises
 * insufficient_privilege, and the portal would then render « Accès refusé » —
 * a serious-looking screen — because someone mistyped a query string. A filter
 * is not a route: unrecognised means "no filter". The routes that must 404 on a
 * foreign slug are the /campagnes/[slug] pages, which arrive in stage 3.
 */
export function parseCampaign(raw: string | undefined, owned: string[]): string | null {
  if (!raw) return null;
  return owned.includes(raw) ? raw : null;
}

/** The campaigns in scope for the current filter — the basis of the cost-per-contact rule. */
export function selectedCampaigns(campaigns: CampaignRow[], slug: string | null): CampaignRow[] {
  return slug ? campaigns.filter((c) => c.slug === slug) : campaigns;
}
