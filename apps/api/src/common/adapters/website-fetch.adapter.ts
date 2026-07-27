import { Injectable, Logger } from '@nestjs/common';
import { promises as dns } from 'node:dns';
import { isIPv4, isIPv6 } from 'node:net';

// SSRF-guarded fetch of a business's own website — Doc 22 §16. The URL
// being fetched here is data Google is *reflecting* from a business's own
// Places listing, not something we fully trust: a compromised or
// malicious listing could point `websiteUri` at an internal service.
//
// Known limitation (documented, not silently ignored — see DECISIONS.md):
// this validates the resolved IP *before* connecting and re-validates on
// every redirect hop, which blocks the common cases (a listing pointing
// straight at a private IP, or a redirect chain that ends inside our own
// network). It does not fully close a DNS-rebinding race (validate one IP,
// have the TCP connection itself resolve to a different IP a moment
// later) — doing that requires pinning the exact validated IP at the
// socket layer via a custom fetch dispatcher, which is a larger change
// deferred to a dedicated hardening pass rather than guessed at here.

export interface WebsiteFetchResult {
  ok: boolean;
  statusCode: number | null;
  html: string | null;
  finalUrl: string | null;
  errorReason: string | null;
}

const REQUEST_TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2MB
const USER_AGENT = 'RiznexiaLeadDiscoveryBot/1.0 (+https://riznexia.com)';

@Injectable()
export class WebsiteFetchAdapter {
  private readonly logger = new Logger(WebsiteFetchAdapter.name);

  async fetch(url: string): Promise<WebsiteFetchResult> {
    let currentUrl = url;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const validation = await this.validate(currentUrl);
      if (!validation.ok) {
        return {
          ok: false,
          statusCode: null,
          html: null,
          finalUrl: null,
          errorReason: validation.reason,
        };
      }

      let response: Response;
      try {
        response = await fetch(currentUrl, {
          redirect: 'manual', // we re-validate every hop ourselves — see file header
          headers: { 'User-Agent': USER_AGENT },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (error) {
        return {
          ok: false,
          statusCode: null,
          html: null,
          finalUrl: null,
          errorReason: error instanceof Error ? error.message : 'fetch failed',
        };
      }

      if (isRedirect(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          return {
            ok: false,
            statusCode: response.status,
            html: null,
            finalUrl: null,
            errorReason: 'Redirect with no Location header',
          };
        }
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      const html = await this.readBodyWithCap(response);
      return {
        ok: response.ok,
        statusCode: response.status,
        html,
        finalUrl: currentUrl,
        errorReason: response.ok ? null : `HTTP ${response.status}`,
      };
    }

    return {
      ok: false,
      statusCode: null,
      html: null,
      finalUrl: null,
      errorReason: 'Too many redirects',
    };
  }

  private async validate(rawUrl: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return { ok: false, reason: 'Malformed URL' };
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, reason: `Disallowed scheme: ${parsed.protocol}` };
    }

    let addresses: string[];
    try {
      const records = await dns.lookup(parsed.hostname, { all: true });
      addresses = records.map((record) => record.address);
    } catch {
      return { ok: false, reason: 'DNS resolution failed' };
    }

    if (addresses.length === 0) {
      return { ok: false, reason: 'DNS resolution returned no addresses' };
    }

    for (const address of addresses) {
      if (isPrivateOrReservedIp(address)) {
        this.logger.warn(`Blocked SSRF-suspect target ${parsed.hostname} -> ${address}`);
        return { ok: false, reason: 'Target resolves to a private/reserved IP address' };
      }
    }

    return { ok: true };
  }

  private async readBodyWithCap(response: Response): Promise<string | null> {
    if (!response.body) {
      return null;
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        totalBytes += value.byteLength;
        if (totalBytes > MAX_RESPONSE_BYTES) {
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf-8');
  }
}

function isRedirect(status: number): boolean {
  return status >= 300 && status < 400;
}

function isPrivateOrReservedIp(address: string): boolean {
  if (isIPv4(address)) {
    return isPrivateIPv4(address);
  }
  if (isIPv6(address)) {
    return isPrivateIPv6(address);
  }
  // Not a recognizable IPv4/IPv6 literal — fail closed.
  return true;
}

function isPrivateIPv4(address: string): boolean {
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => Number.isNaN(octet))) {
    return true; // fail closed on anything unparseable
  }
  const [a, b] = octets;
  if (a === undefined || b === undefined) {
    return true; // fail closed — should be unreachable after the length check above
  }

  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (incl. cloud metadata endpoint)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 carrier-grade NAT
  if (a === 192 && b === 0 && octets[2] === 0) return true; // 192.0.0.0/24 IETF protocol assignments
  if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved + broadcast

  return false;
}

function isPrivateIPv6(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === '::1') return true; // loopback
  if (normalized === '::') return true; // unspecified
  if (
    normalized.startsWith('fe80:') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9')
  )
    return true; // link-local fe80::/10
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // unique local fc00::/7
  if (normalized.startsWith('::ffff:')) {
    // IPv4-mapped IPv6 address — validate the embedded IPv4 too.
    return isPrivateIPv4(normalized.replace('::ffff:', ''));
  }
  return false;
}
