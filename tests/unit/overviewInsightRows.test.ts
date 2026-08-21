import { afterEach, describe, expect, it, vi } from 'vitest';
import { optionalRows } from '@/lib/data/overview';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('optionalRows', () => {
  it('passes the rows through when the read succeeded', () => {
    expect(optionalRows('client_scans_tech', { data: [{ a: 1 }], error: null })).toEqual([{ a: 1 }]);
  });

  it('reads an empty result as empty, NOT as a failure', () => {
    // [] and null are different answers: one says « nobody scanned », the other
    // says « we could not find out ». An insight built on the first is honest;
    // one built on the second is invented.
    expect(optionalRows('client_scans_tech', { data: [], error: null })).toEqual([]);
  });

  it('treats a null payload from a successful call as empty', () => {
    expect(optionalRows('client_scans_tech', { data: null, error: null })).toEqual([]);
  });

  it('returns null on failure so the caller can drop the insight', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(optionalRows('client_scans_tech', { data: null, error: { code: '42P01', message: 'boom' } })).toBeNull();
  });

  it('logs the code and the message, and nothing else', () => {
    // This log line sits in a request that has just read a client's own
    // aggregates. Anything derived from a row reaching it would put audience
    // data in a server log.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    optionalRows('client_scans_geo', { data: null, error: { code: '42501', message: 'accès refusé' } });

    expect(warn).toHaveBeenCalledTimes(1);
    const logged = warn.mock.calls[0].join(' ');
    expect(logged).toContain('client_scans_geo');
    expect(logged).toContain('42501');
    expect(logged).toContain('accès refusé');
  });
});
