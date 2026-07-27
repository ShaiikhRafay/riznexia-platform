import { promises as dns } from 'node:dns';
import { WebsiteFetchAdapter } from './website-fetch.adapter';

jest.mock('node:dns', () => ({
  promises: { lookup: jest.fn() },
}));

function htmlResponse(
  status: number,
  html: string,
  headers: Record<string, string> = {},
): Response {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(html);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
    body: {
      getReader: () => {
        let read = false;
        return {
          read: async () => {
            if (read) return { done: true, value: undefined };
            read = true;
            return { done: false, value: bytes };
          },
          releaseLock: () => {},
          cancel: async () => {},
        };
      },
    },
  } as unknown as Response;
}

describe('WebsiteFetchAdapter', () => {
  const lookupMock = dns.lookup as jest.Mock;
  let adapter: WebsiteFetchAdapter;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new WebsiteFetchAdapter();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  describe('scheme validation', () => {
    it('rejects a file:// URL without ever resolving DNS or fetching', async () => {
      const result = await adapter.fetch('file:///etc/passwd');
      expect(result.ok).toBe(false);
      expect(result.errorReason).toContain('Disallowed scheme');
      expect(lookupMock).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects a malformed URL', async () => {
      const result = await adapter.fetch('not a url');
      expect(result.ok).toBe(false);
      expect(result.errorReason).toBe('Malformed URL');
    });
  });

  describe('SSRF IP-range guard', () => {
    it.each([
      ['10.0.0.5', '10.0.0.0/8'],
      ['127.0.0.1', 'loopback'],
      ['169.254.169.254', 'link-local / cloud metadata'],
      ['172.16.0.1', '172.16.0.0/12'],
      ['172.31.255.255', '172.16.0.0/12 upper bound'],
      ['192.168.1.1', '192.168.0.0/16'],
      ['100.64.0.1', 'carrier-grade NAT'],
      ['0.0.0.0', 'this-network'],
      ['224.0.0.1', 'multicast'],
    ])('blocks a target resolving to %s (%s)', async (ip) => {
      lookupMock.mockResolvedValue([{ address: ip, family: 4 }]);
      const result = await adapter.fetch('http://evil.example.com');
      expect(result.ok).toBe(false);
      expect(result.errorReason).toContain('private/reserved');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('blocks an IPv6 loopback target', async () => {
      lookupMock.mockResolvedValue([{ address: '::1', family: 6 }]);
      const result = await adapter.fetch('http://evil.example.com');
      expect(result.ok).toBe(false);
    });

    it('blocks an IPv6 unique-local (fc00::/7) target', async () => {
      lookupMock.mockResolvedValue([{ address: 'fd12:3456:789a:1::1', family: 6 }]);
      const result = await adapter.fetch('http://evil.example.com');
      expect(result.ok).toBe(false);
    });

    it('blocks when ANY resolved address is private, even if others are public', async () => {
      lookupMock.mockResolvedValue([
        { address: '8.8.8.8', family: 4 },
        { address: '127.0.0.1', family: 4 },
      ]);
      const result = await adapter.fetch('http://mixed.example.com');
      expect(result.ok).toBe(false);
    });

    it('allows a genuinely public IP', async () => {
      lookupMock.mockResolvedValue([{ address: '203.0.113.10', family: 4 }]);
      fetchMock.mockResolvedValue(htmlResponse(200, '<html></html>'));
      const result = await adapter.fetch('http://joesdiner.com');
      expect(result.ok).toBe(true);
    });

    it('fails closed when DNS resolution fails entirely', async () => {
      lookupMock.mockRejectedValue(new Error('ENOTFOUND'));
      const result = await adapter.fetch('http://does-not-resolve.example.com');
      expect(result.ok).toBe(false);
      expect(result.errorReason).toBe('DNS resolution failed');
    });
  });

  describe('redirect handling', () => {
    it('follows a redirect to a public host and re-validates it', async () => {
      lookupMock.mockResolvedValue([{ address: '203.0.113.10', family: 4 }]);
      fetchMock
        .mockResolvedValueOnce(htmlResponse(301, '', { location: 'http://www.joesdiner.com' }))
        .mockResolvedValueOnce(htmlResponse(200, '<html>final</html>'));

      const result = await adapter.fetch('http://joesdiner.com');

      expect(result.ok).toBe(true);
      expect(result.finalUrl).toBe('http://www.joesdiner.com/');
      expect(lookupMock).toHaveBeenCalledTimes(2); // both hops re-validated
    });

    it('blocks a redirect chain that ends at a private IP', async () => {
      lookupMock
        .mockResolvedValueOnce([{ address: '203.0.113.10', family: 4 }]) // first hop looks fine
        .mockResolvedValueOnce([{ address: '169.254.169.254', family: 4 }]); // redirect target is not
      fetchMock.mockResolvedValueOnce(
        htmlResponse(302, '', { location: 'http://internal.example.com/metadata' }),
      );

      const result = await adapter.fetch('http://joesdiner.com');

      expect(result.ok).toBe(false);
      expect(result.errorReason).toContain('private/reserved');
      expect(fetchMock).toHaveBeenCalledTimes(1); // never actually fetched the malicious target
    });

    it('gives up after too many redirects', async () => {
      lookupMock.mockResolvedValue([{ address: '203.0.113.10', family: 4 }]);
      fetchMock.mockResolvedValue(htmlResponse(302, '', { location: 'http://joesdiner.com/next' }));

      const result = await adapter.fetch('http://joesdiner.com');

      expect(result.ok).toBe(false);
      expect(result.errorReason).toBe('Too many redirects');
    });
  });

  describe('response handling', () => {
    it('caps the response body rather than reading unbounded data', async () => {
      lookupMock.mockResolvedValue([{ address: '203.0.113.10', family: 4 }]);
      const huge = 'x'.repeat(3 * 1024 * 1024); // 3MB, over the 2MB cap
      fetchMock.mockResolvedValue(htmlResponse(200, huge));

      const result = await adapter.fetch('http://joesdiner.com');

      expect(result.ok).toBe(true);
      expect(result.html?.length).toBeLessThanOrEqual(3 * 1024 * 1024);
      expect(result.html?.length).toBeLessThan(huge.length);
    });

    it('reports a non-2xx status as not ok without throwing', async () => {
      lookupMock.mockResolvedValue([{ address: '203.0.113.10', family: 4 }]);
      fetchMock.mockResolvedValue(htmlResponse(500, ''));

      const result = await adapter.fetch('http://joesdiner.com');

      expect(result.ok).toBe(false);
      expect(result.statusCode).toBe(500);
    });

    it('returns a graceful failure on a network error/timeout rather than throwing', async () => {
      lookupMock.mockResolvedValue([{ address: '203.0.113.10', family: 4 }]);
      fetchMock.mockRejectedValue(new Error('timeout'));

      const result = await adapter.fetch('http://joesdiner.com');

      expect(result.ok).toBe(false);
      expect(result.errorReason).toBe('timeout');
    });
  });
});
