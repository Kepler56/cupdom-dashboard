/**
 * PURE. Resolve the effective client "target" a portal viewer is looking at (#4).
 *
 * A real client (isMember = false) NEVER gets a target: they always see their
 * OWN data and the `?client=` param is ignored outright. Only a Cupdom member
 * may target another client, and only one that actually exists in the picker's
 * allowlist — an unknown or mistyped id falls back to null (the "choose a client"
 * state), never to some arbitrary account.
 *
 * This mirrors parseCampaign's forgiving-filter stance, and — together with the
 * SQL `effective_contact(p_target)` which likewise discards the target for
 * non-members — makes cross-sponsor isolation true on BOTH sides: even if this
 * client-side check were bypassed, the database would still refuse a client's
 * forged target. Belt and braces on a security boundary.
 */
export function resolveTarget(
  rawClient: string | undefined | null,
  isMember: boolean,
  allowedClientIds: string[],
): string | null {
  if (!isMember) return null;
  if (!rawClient) return null;
  return allowedClientIds.includes(rawClient) ? rawClient : null;
}
