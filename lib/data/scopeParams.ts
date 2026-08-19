import type { GeoLevel } from '@/lib/analytics/geo';

const ACCEPTED: readonly string[] = ['country', 'region', 'city', 'venue'];

/**
 * Last line of defence before `client_scans_geo`.
 *
 * The RPC raises `invalid_parameter_value` on an unknown level, and the portal
 * renders that as « Chargement impossible » — a scary screen for what would be
 * a typo. `parseGeoLevel` already guards the URL; this guards the call.
 */
export function levelParam(level: GeoLevel): string {
  return ACCEPTED.includes(level) ? level : 'city';
}
