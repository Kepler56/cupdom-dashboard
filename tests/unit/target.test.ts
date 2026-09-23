import { describe, expect, it } from 'vitest';
import { resolveTarget } from '@/lib/analytics/target';

const allowed = ['contact-a', 'contact-b'];

describe('resolveTarget', () => {
  it('never gives a real client a target — they always see their own data', () => {
    // The forged ?client of another sponsor is ignored for a non-member.
    expect(resolveTarget('contact-b', false, allowed)).toBeNull();
    expect(resolveTarget('contact-a', false, allowed)).toBeNull();
  });

  it('gives a member the requested client when it is in the allowlist', () => {
    expect(resolveTarget('contact-a', true, allowed)).toBe('contact-a');
  });

  it('falls back to null (choose-a-client) for a member targeting an unknown id', () => {
    expect(resolveTarget('contact-zzz', true, allowed)).toBeNull();
  });

  it('is null when a member has selected no client yet', () => {
    expect(resolveTarget(undefined, true, allowed)).toBeNull();
    expect(resolveTarget(null, true, allowed)).toBeNull();
    expect(resolveTarget('', true, allowed)).toBeNull();
  });
});
