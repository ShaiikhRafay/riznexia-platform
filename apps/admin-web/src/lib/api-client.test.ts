import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { apiClient, ApiError } from './api-client';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

describe('apiClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('GETs against NEXT_PUBLIC_API_BASE_URL and returns the parsed JSON body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: '1', name: 'Joe' }));

    const result = await apiClient.get<{ id: string; name: string }>('/leads/1');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/leads/1',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result).toEqual({ id: '1', name: 'Joe' });
  });

  it('attaches the Bearer token when one is provided, and omits the header otherwise', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await apiClient.get('/me', { token: 'clerk-jwt' });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer clerk-jwt');

    fetchMock.mockClear();
    await apiClient.get('/me', { token: null });
    const [, init2] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init2.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('sends a JSON body and Content-Type on POST', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: '1' }, { status: 201 }));
    await apiClient.post('/leads', { businessName: "Joe's Diner" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ businessName: "Joe's Diner" }));
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('returns undefined for a 204 No Content response', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const result = await apiClient.delete('/leads/1');
    expect(result).toBeUndefined();
  });

  it('parses a non-JSON (CSV export) response body as text', async () => {
    fetchMock.mockResolvedValue(
      new Response('label,count\nrestaurant,4', {
        status: 200,
        headers: { 'content-type': 'text/csv' },
      }),
    );
    const result = await apiClient.get<string>(
      '/analytics/reports/business_category/export?format=csv',
    );
    expect(result).toBe('label,count\nrestaurant,4');
  });

  it('throws an ApiError carrying the backend envelope’s code/message/details on a non-2xx response', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { error: { code: 'LEAD_NOT_FOUND', message: 'Lead not found', details: { leadId: 'x' } } },
        { status: 404 },
      ),
    );

    await expect(apiClient.get('/leads/x')).rejects.toMatchObject({
      code: 'LEAD_NOT_FOUND',
      message: 'Lead not found',
      status: 404,
      details: { leadId: 'x' },
    });
  });

  it('falls back to UNKNOWN_ERROR when a non-2xx response has no recognizable error envelope', async () => {
    fetchMock.mockResolvedValue(new Response('Internal Server Error', { status: 500 }));
    await expect(apiClient.get('/leads')).rejects.toMatchObject({
      code: 'UNKNOWN_ERROR',
      status: 500,
    });
  });

  it('wraps a fetch-level rejection (offline/DNS failure) as a NETWORK_ERROR ApiError', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(apiClient.get('/leads')).rejects.toBeInstanceOf(ApiError);
    await expect(apiClient.get('/leads')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      status: 0,
    });
  });

  it('warns (dev-only) but does not throw when the response fails its expected schema', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock.mockResolvedValue(jsonResponse({ unexpected: true }));

    const schema = z.object({ id: z.string() });
    const result = await apiClient.get('/leads/1', { schema });

    expect(result).toEqual({ unexpected: true });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('did not match its expected schema'),
      expect.anything(),
    );
  });
});
