import type {
  CampaignRow,
  DailyRow,
  FunnelRow,
  GeoRow,
  LeadRow,
  OverviewRow,
  TechRow,
} from '@/lib/analytics/types';
import type { PeriodRange } from '@/lib/period';
import { createServerClient } from '@/lib/supabase/server';
import { fetchRecentLeads } from './leads';
import { classifyPostgrestError, type Failure } from './result';
import { resolveScope } from './scope';
import { levelParam } from './scopeParams';

export interface CampaignDetailData {
  campaign: CampaignRow;
  current: OverviewRow;
  previous: OverviewRow;
  daily: DailyRow[];
  funnel: FunnelRow;
  geo: GeoRow[];
  tech: TechRow[];
  /** Null when the read failed — LeadsPreview renders that as its own state, not as zero contacts. */
  leads: LeadRow[] | null;
}

/**
 * A THIRD failure kind, local to this module.
 *
 * Spec §6: « A campaign slug not owned by the caller raises, and the route
 * returns 404 rather than an empty page. » 404 is not « Accès refusé » — a
 * refusal screen for a mistyped or stale URL tells the client they have been
 * locked out of something, which is both alarming and false. It is also not an
 * error state, because nothing failed.
 *
 * Local rather than added to `Failure` in result.ts on purpose: every other page
 * branches on `failure.kind === 'refused' ? … : <ErrorState/>`, and widening the
 * shared union would silently route a 404 into « Chargement impossible » on
 * three screens that can never produce one.
 */
export type CampaignFailure = Failure | { kind: 'notFound' };

export type CampaignResult =
  | { ok: true; data: CampaignDetailData }
  | { ok: false; failure: CampaignFailure };

const EMPTY_FUNNEL: FunnelRow = {
  distribues: 0,
  scannes: 0,
  formulaire_vu: 0,
  formulaire_soumis: 0,
  offre_atteinte: 0,
};

const emptyBucket = (bucket: OverviewRow['bucket']): OverviewRow => ({ bucket, scans: 0, uniques: 0, leads: 0 });

/**
 * The caller's own campaign, or null.
 *
 * Extracted and exported so the rule that produces a 404 is a named, tested
 * unit rather than an inline `.find()` buried in a loader. Spec §6: a slug the
 * caller does not own is 404, never « Accès refusé » — so this lookup is what
 * must run BEFORE any slug reaches an RPC, and the early return below is what
 * enforces that.
 */
export function ownedCampaign(campaigns: CampaignRow[], slug: string): CampaignRow | null {
  return campaigns.find((c) => c.slug === slug) ?? null;
}

/**
 * Everything one campaign's page needs.
 *
 * OWNERSHIP IS RESOLVED FIRST, and that ordering is the whole security and UX
 * story of this function. `client_campaigns()` returns exactly the campaigns
 * this client owns; a slug absent from that list never reaches an RPC. Handing
 * it to one instead would raise `insufficient_privilege`, which the portal
 * renders as « Accès refusé » — the wrong screen for a stale bookmark, and a
 * screen that also signs the user out.
 *
 * What actually guards that ordering today: the early return below, ahead of
 * the `Promise.all`, plus the end-to-end test in Task 9 that asserts an
 * unknown slug renders the 404 page and that « Accès refusé » never appears.
 * `ownedCampaign` itself is unit-tested for its lookup rule (owned / absent /
 * empty roster / no partial-slug matching) — that proves the RULE is correct,
 * not that this function calls it before the RPCs fire; nothing here replaces
 * the Task 9 end-to-end check for the ordering itself.
 */
export async function fetchCampaign(args: {
  slug: string;
  range: PeriodRange;
}): Promise<CampaignResult> {
  const supabase = await createServerClient();

  const scope = await resolveScope(supabase, undefined);
  if (!scope.ok) return scope;

  const campaign = ownedCampaign(scope.data.campaigns, args.slug);
  if (!campaign) return { ok: false, failure: { kind: 'notFound' } };

  // Spec §4.8: `venue` lives on the campaign, so a single campaign's venue
  // ranking is one bar reading its own venue name. The header states the venue;
  // the chart shows CITIES, which is the cut that still carries information at
  // this scope. The venue COMPARISON is a roster-level question and lives on
  // /audience (Task 8).
  const geoLevel = 'city' as const;

  const from = args.range.from.toISOString();
  const to = args.range.to.toISOString();

  const [overview, daily, funnel, geo, tech, leads] = await Promise.all([
    supabase.rpc('client_overview', {
      p_from: from,
      p_to: to,
      p_prev_from: args.range.prevFrom.toISOString(),
      p_prev_to: args.range.prevTo.toISOString(),
      p_slug: campaign.slug,
    }),
    supabase.rpc('client_scans_daily', { p_from: from, p_to: to, p_slug: campaign.slug }),
    // No date parameters — the funnel is always campaign lifetime (spec §4.9).
    supabase.rpc('client_funnel', { p_slug: campaign.slug }),
    supabase.rpc('client_scans_geo', { p_from: from, p_to: to, p_slug: campaign.slug, p_level: levelParam(geoLevel) }),
    supabase.rpc('client_scans_tech', { p_from: from, p_to: to, p_slug: campaign.slug }),
    fetchRecentLeads(supabase, campaign.slug),
  ]);

  // Five RPC responses only — fetchRecentLeads never returns an error shape.
  const failed = [overview, daily, funnel, geo, tech].find((r) => r.error);
  if (failed) return { ok: false, failure: classifyPostgrestError(failed.error) };

  const buckets = (overview.data ?? []) as OverviewRow[];

  return {
    ok: true,
    data: {
      campaign,
      current: buckets.find((b) => b.bucket === 'current') ?? emptyBucket('current'),
      previous: buckets.find((b) => b.bucket === 'previous') ?? emptyBucket('previous'),
      daily: (daily.data ?? []) as DailyRow[],
      funnel: ((funnel.data ?? []) as FunnelRow[])[0] ?? EMPTY_FUNNEL,
      geo: (geo.data ?? []) as GeoRow[],
      tech: (tech.data ?? []) as TechRow[],
      leads,
    },
  };
}
