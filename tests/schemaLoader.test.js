import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchRaw, simpleFetch, defaultRulesUrl, loadDefaultRules } from '../src/utils/schemaLoader.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body, ok = true) {
  return { ok, status: ok ? 200 : 404, json: () => Promise.resolve(body) };
}

describe('fetchRaw', () => {
  it('returns the local copy when it fetches successfully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({ local: true })));
    expect(await fetchRaw('foo.json')).toEqual({ local: true });
  });

  it('falls back to the GitHub raw URL when the local fetch fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(null, false))
      .mockResolvedValueOnce(jsonResponse({ remote: true }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchRaw('foo.json')).toEqual({ remote: true });
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining('raw.githubusercontent.com/fedramp/schemas/main/foo.json'));
  });

  it('returns null when both the local and remote fetch fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    expect(await fetchRaw('foo.json')).toBeNull();
  });
});

describe('simpleFetch', () => {
  it('resolves with parsed JSON on a 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({ ok: 1 })));
    expect(await simpleFetch('http://x/y')).toEqual({ ok: 1 });
  });

  it('resolves to null (not a rejection) on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(null, false)));
    expect(await simpleFetch('http://x/y')).toBeNull();
  });

  it('resolves to null when fetch itself rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('boom')));
    expect(await simpleFetch('http://x/y')).toBeNull();
  });
});

describe('defaultRulesUrl', () => {
  it('maps a schema filename to its rules/ counterpart', () => {
    expect(defaultRulesUrl('fedramp-security-decision-record-schema-2026-06-24.json'))
      .toBe('rules/fedramp-security-decision-record-schema-2026-06-24.rules.json');
  });
});

describe('loadDefaultRules', () => {
  it('returns [] when no default rules file exists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(null, false)));
    expect(await loadDefaultRules('foo.json')).toEqual([]);
  });

  it('normalizes a bare-array rules file', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse([{ id: 'r1' }])));
    expect(await loadDefaultRules('foo.json')).toEqual([{ id: 'r1' }]);
  });

  it('returns [] when the fetched file is not a valid rules shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({ nope: true })));
    expect(await loadDefaultRules('foo.json')).toEqual([]);
  });
});
