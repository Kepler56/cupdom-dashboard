import { describe, expect, it } from 'vitest';
import { groupTech, humanTechLabel, TECH_SECTIONS } from '@/lib/analytics/tech';
import type { TechRow } from '@/lib/analytics/types';

const row = (dimension: string, label: string, scans: number): TechRow => ({ dimension, label, scans });

describe('humanTechLabel', () => {
  it('translates device types into French', () => {
    expect(humanTechLabel('device_type', 'mobile')).toBe('Mobile');
    expect(humanTechLabel('device_type', 'desktop')).toBe('Ordinateur');
    expect(humanTechLabel('device_type', 'tablet')).toBe('Tablette');
  });

  it('translates language codes', () => {
    expect(humanTechLabel('language', 'fr')).toBe('Français');
    expect(humanTechLabel('language', 'en')).toBe('Anglais');
  });

  it('normalises a regional language tag to its base language', () => {
    expect(humanTechLabel('language', 'fr-CA')).toBe('Français');
  });

  // iOS, Android, Safari, Chrome are proper nouns — translating them would be
  // worse than leaving them, and inventing a mapping for every future UA string
  // guarantees the list goes stale.
  it('passes an OS or browser name through untouched', () => {
    expect(humanTechLabel('os', 'iOS')).toBe('iOS');
    expect(humanTechLabel('browser', 'Safari')).toBe('Safari');
  });

  it('passes an unknown value through rather than hiding it', () => {
    expect(humanTechLabel('device_type', 'smartwatch')).toBe('smartwatch');
    expect(humanTechLabel('language', 'xx')).toBe('xx');
  });

  it('keeps the unknown bucket as-is', () => {
    expect(humanTechLabel('device_type', 'Inconnu')).toBe('Inconnu');
  });
});

describe('groupTech', () => {
  const rows = [
    row('device_type', 'mobile', 880),
    row('device_type', 'desktop', 80),
    row('device_type', 'tablet', 40),
    row('os', 'iOS', 600),
    row('os', 'Android', 400),
    row('browser', 'Safari', 620),
    row('browser', 'Chrome', 380),
    row('language', 'fr', 900),
    row('language', 'en', 100),
  ];

  it('returns one ranking per dimension', () => {
    const g = groupTech(rows);
    expect(Object.keys(g).sort()).toEqual(['browser', 'device_type', 'language', 'os']);
  });

  it('shares are computed within a dimension, not across the whole result set', () => {
    const g = groupTech(rows);
    expect(g.device_type.total).toBe(1000);
    expect(g.device_type.rows[0].shareLabel).toBe('88\u00A0%');
  });

  it('applies the French labels', () => {
    expect(groupTech(rows).device_type.rows.map((r) => r.label)).toEqual([
      'Mobile', 'Ordinateur', 'Tablette',
    ]);
    expect(groupTech(rows).language.rows[0].label).toBe('Français');
  });

  it('reports no uniques — the RPC does not count people for technology', () => {
    expect(groupTech(rows).device_type.rows[0].uniques).toBeNull();
  });

  it('yields an empty ranking for a dimension with no rows', () => {
    const g = groupTech([row('os', 'iOS', 10)]);
    expect(g.device_type.rows).toEqual([]);
    expect(g.device_type.empty).toBe(true);
  });

  // The scan function stores the raw first Accept-Language token, so real
  // French traffic arrives as several rows — fr-FR, fr, fr-fr, fr-CA — that all
  // humanise to « Français ». Without re-aggregation the section renders one
  // bar per raw tag, each with a fragment of the true share, and RankedBars
  // keys by label so React sees duplicate keys.
  it('merges rows that humanise to the same label', () => {
    const g = groupTech([row('language', 'fr-FR', 60), row('language', 'fr', 40)]);
    expect(g.language.rows).toHaveLength(1);
    expect(g.language.rows[0].label).toBe('Français');
    expect(g.language.rows[0].scans).toBe(100);
  });

  it('merges device types that differ only by case', () => {
    const g = groupTech([row('device_type', 'Mobile', 30), row('device_type', 'mobile', 70)]);
    expect(g.device_type.rows).toHaveLength(1);
    expect(g.device_type.rows[0].label).toBe('Mobile');
    expect(g.device_type.rows[0].scans).toBe(100);
  });

  it('ignores a dimension the RPC does not define', () => {
    const g = groupTech([...rows, row('screen_size', 'large', 5)]);
    expect(Object.keys(g)).toHaveLength(4);
  });

  it('exposes the four sections in display order with French headings', () => {
    expect(TECH_SECTIONS.map((s) => s.label)).toEqual([
      'Appareil', 'Système', 'Navigateur', 'Langue',
    ]);
  });
});
