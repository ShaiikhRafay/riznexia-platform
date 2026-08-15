import type { ConfigService } from '@nestjs/config';
import { UpstreamProviderException } from '../../common/exceptions/app.exception';
import { VercelAdapter } from './vercel.adapter';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('VercelAdapter', () => {
  let config: { get: jest.Mock };
  let adapter: VercelAdapter;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    config = {
      get: jest.fn((key: string) =>
        key === 'GOOGLE_PLACES_API_KEY' ? 'test-places-key' : 'test-vercel-token',
      ),
    };
    adapter = new VercelAdapter(config as unknown as ConfigService);
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  describe('isConfigured', () => {
    it('returns true when VERCEL_API_TOKEN is set', () => {
      expect(adapter.isConfigured()).toBe(true);
    });

    it('returns false when VERCEL_API_TOKEN is missing', () => {
      config.get.mockReturnValue(undefined);
      expect(adapter.isConfigured()).toBe(false);
    });
  });

  describe('createDeployment', () => {
    it('sends the project name, files, and target, and maps the response', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          id: 'dpl_1',
          url: 'my-app-abc.vercel.app',
          name: 'my-app',
          readyState: 'QUEUED',
        }),
      );

      const result = await adapter.createDeployment({
        name: 'my-app',
        files: [{ path: 'package.json', content: '{}' }],
        target: 'production',
      });

      expect(result).toEqual({
        id: 'dpl_1',
        url: 'my-app-abc.vercel.app',
        projectName: 'my-app',
        readyState: 'QUEUED',
        errorMessage: null,
      });

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/v13/deployments');
      const body = JSON.parse(options.body as string) as {
        name: string;
        target: string;
        files: { file: string; data: string }[];
        env?: Record<string, string>;
      };
      expect(body).toEqual({
        name: 'my-app',
        target: 'production',
        files: [{ file: 'package.json', data: '{}' }],
        env: { NEXT_PUBLIC_GOOGLE_PLACES_API_KEY: 'test-places-key' },
      });
    });

    it('omits env entirely when GOOGLE_PLACES_API_KEY is not configured', async () => {
      config.get.mockImplementation((key: string) =>
        key === 'VERCEL_API_TOKEN' ? 'test-vercel-token' : undefined,
      );
      fetchMock.mockResolvedValue(
        jsonResponse(200, { id: 'dpl_1', url: 'x.vercel.app', name: 'x', readyState: 'QUEUED' }),
      );

      await adapter.createDeployment({ name: 'x', files: [], target: 'production' });

      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string) as Record<string, unknown>;
      expect(body).not.toHaveProperty('env');
    });

    it('includes a teamId query param when VERCEL_TEAM_ID is configured', async () => {
      config.get.mockImplementation((key: string) =>
        key === 'VERCEL_TEAM_ID' ? 'team_1' : 'test-vercel-token',
      );
      fetchMock.mockResolvedValue(
        jsonResponse(200, { id: 'dpl_1', url: 'x.vercel.app', name: 'x', readyState: 'QUEUED' }),
      );

      await adapter.createDeployment({ name: 'x', files: [], target: 'production' });

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('teamId=team_1');
    });

    it('throws UpstreamProviderException when VERCEL_API_TOKEN is not configured', async () => {
      config.get.mockReturnValue(undefined);
      await expect(
        adapter.createDeployment({ name: 'x', files: [], target: 'production' }),
      ).rejects.toBeInstanceOf(UpstreamProviderException);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('maps a non-2xx response to UpstreamProviderException', async () => {
      fetchMock.mockResolvedValue(jsonResponse(400, { error: { message: 'Invalid files' } }));
      await expect(
        adapter.createDeployment({ name: 'x', files: [], target: 'production' }),
      ).rejects.toBeInstanceOf(UpstreamProviderException);
    });

    it('maps a network failure to UpstreamProviderException', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNRESET'));
      await expect(
        adapter.createDeployment({ name: 'x', files: [], target: 'production' }),
      ).rejects.toBeInstanceOf(UpstreamProviderException);
    });
  });

  describe('getDeployment', () => {
    it('returns the mapped status including a captured error message', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          id: 'dpl_1',
          url: 'x.vercel.app',
          name: 'x',
          readyState: 'ERROR',
          errorMessage: { message: 'Build failed' },
        }),
      );
      const result = await adapter.getDeployment('dpl_1');
      expect(result).toEqual({
        id: 'dpl_1',
        url: 'x.vercel.app',
        projectName: 'x',
        readyState: 'ERROR',
        errorMessage: 'Build failed',
      });
    });
  });

  describe('attachDomain', () => {
    it('posts to the project domains endpoint and returns verification detail', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          name: 'example.com',
          verified: false,
          verification: [{ type: 'TXT', domain: 'example.com', value: 'abc', reason: 'pending' }],
        }),
      );

      const result = await adapter.attachDomain('my-app', 'example.com');

      expect(result.verified).toBe(false);
      expect(result.verification).toHaveLength(1);
      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/v10/projects/my-app/domains');
      expect(JSON.parse(options.body as string)).toEqual({ name: 'example.com' });
    });
  });
});
