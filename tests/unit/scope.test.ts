import { describe, expect, it } from 'vitest';
import { levelParam } from '@/lib/data/scopeParams';

describe('levelParam', () => {
  it('passes the RPC the level name it expects', () => {
    expect(levelParam('city')).toBe('city');
    expect(levelParam('venue')).toBe('venue');
  });

  // client_scans_geo raises invalid_parameter_value on anything outside its
  // four names, which the portal would render as « Chargement impossible ».
  it('falls back to a level the RPC accepts rather than letting it raise', () => {
    expect(levelParam('arrondissement' as never)).toBe('city');
  });
});
