import { describe, expect, it } from 'vitest';
import { buildCampaignHeader, destinationView } from '@/lib/analytics/campaign';
import type { CampaignRow } from '@/lib/analytics/types';

const base: CampaignRow = {
  slug: 'demo-rex-club',
  name: 'Rex Club — Été',
  sponsor_name: 'Démo Nightlife',
  product: 'Couvercle 40 cl',
  destination_url: 'https://demo-nightlife.test/rex?utm_source=cupdom',
  active: true,
  venue: 'Rex Club',
  distributed_count: 5000,
  invested_amount_eur: 4200,
  created_at: '2026-05-17T09:30:00Z',
  scans: 1200,
  uniques: 900,
  leads: 210,
};

describe('destinationView', () => {
  it('shows the host and keeps the full URL as the target', () => {
    expect(destinationView('https://demo-nightlife.test/rex?utm_source=cupdom')).toEqual({
      href: 'https://demo-nightlife.test/rex?utm_source=cupdom',
      host: 'demo-nightlife.test',
    });
  });

  it('refuses a scheme that is not http or https', () => {
    // This value comes out of the CRM and lands in an href a client clicks.
    // An allowlist is the whole defence against javascript: and data:.
    expect(destinationView('javascript:alert(1)')).toBeNull();
    expect(destinationView('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('returns null rather than throwing on a malformed URL', () => {
    expect(destinationView('pas une url')).toBeNull();
    expect(destinationView('')).toBeNull();
    expect(destinationView(null)).toBeNull();
  });
});

describe('buildCampaignHeader', () => {
  it('dates the launch on the Paris calendar', () => {
    expect(buildCampaignHeader(base).createdLabel).toBe('17 mai 2026');
  });

  it('rolls a late-evening UTC creation forward to the Paris day', () => {
    // 2026-05-17T23:30Z is 01:30 Paris on the 18th.
    const header = buildCampaignHeader({ ...base, created_at: '2026-05-17T23:30:00Z' });
    expect(header.createdLabel).toBe('18 mai 2026');
  });

  it('says nothing rather than something wrong when the date is unusable', () => {
    expect(buildCampaignHeader({ ...base, created_at: 'n’importe quoi' }).createdLabel).toBeNull();
  });

  it('treats a blank produit or lieu as absent', () => {
    const header = buildCampaignHeader({ ...base, product: '   ', venue: '' });
    expect(header.product).toBeNull();
    expect(header.venue).toBeNull();
  });

  it('carries the campaign through unchanged where there is nothing to decide', () => {
    const header = buildCampaignHeader(base);
    expect(header.name).toBe('Rex Club — Été');
    expect(header.active).toBe(true);
    expect(header.venue).toBe('Rex Club');
    expect(header.destination?.host).toBe('demo-nightlife.test');
  });
});
