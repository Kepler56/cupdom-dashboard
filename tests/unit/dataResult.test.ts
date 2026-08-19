import { describe, expect, it } from 'vitest';
import { classifyPostgrestError, GENERIC_ERROR_FR } from '@/lib/data/result';

describe('classifyPostgrestError', () => {
  // Every stage-1 RPC guard raises with errcode = insufficient_privilege, which
  // PostgREST surfaces as SQLSTATE 42501.
  it('treats 42501 as a refusal', () => {
    expect(classifyPostgrestError({ code: '42501', message: 'accès refusé' })).toEqual({ kind: 'refused' });
  });

  it('treats the guard message as a refusal even without a code', () => {
    expect(classifyPostgrestError({ message: 'accès refusé' })).toEqual({ kind: 'refused' });
  });

  it('treats anything else as a transient error', () => {
    expect(classifyPostgrestError({ code: '08006', message: 'connection failure' })).toEqual({
      kind: 'error',
      message: GENERIC_ERROR_FR,
    });
  });

  // The raw text is English, leaks schema detail, and helps nobody.
  it('never lets the raw Supabase message reach the UI', () => {
    const failure = classifyPostgrestError({ code: '42P01', message: 'relation "qr_scans" does not exist' });
    expect(JSON.stringify(failure)).not.toContain('qr_scans');
  });

  it('treats a missing error object as a transient error rather than throwing', () => {
    expect(classifyPostgrestError(null).kind).toBe('error');
  });
});
