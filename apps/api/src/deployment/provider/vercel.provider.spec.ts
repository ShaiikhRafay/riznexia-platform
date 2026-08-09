import { VercelProvider } from './vercel.provider';
import type { VercelAdapter } from './vercel.adapter';

describe('VercelProvider', () => {
  let vercelAdapter: {
    isConfigured: jest.Mock;
    createDeployment: jest.Mock;
    getDeployment: jest.Mock;
    attachDomain: jest.Mock;
  };
  let provider: VercelProvider;

  beforeEach(() => {
    vercelAdapter = {
      isConfigured: jest.fn(),
      createDeployment: jest.fn(),
      getDeployment: jest.fn(),
      attachDomain: jest.fn(),
    };
    provider = new VercelProvider(vercelAdapter as unknown as VercelAdapter);
  });

  it('exposes name "vercel" and delegates isConfigured to the adapter', () => {
    expect(provider.name).toBe('vercel');
    vercelAdapter.isConfigured.mockReturnValue(true);
    expect(provider.isConfigured()).toBe(true);
  });

  describe('deploy', () => {
    it('maps environment=production to target=production and returns a normalized result', async () => {
      vercelAdapter.createDeployment.mockResolvedValue({
        id: 'dpl_1',
        url: 'my-app.vercel.app',
        projectName: 'my-app',
        readyState: 'QUEUED',
        errorMessage: null,
      });

      const result = await provider.deploy({
        files: [],
        projectName: 'my-app',
        environment: 'production',
      });

      expect(vercelAdapter.createDeployment).toHaveBeenCalledWith({
        name: 'my-app',
        files: [],
        target: 'production',
      });
      expect(result).toEqual({
        providerDeploymentId: 'dpl_1',
        liveUrl: 'https://my-app.vercel.app',
      });
    });

    it('maps environment=preview to target=staging', async () => {
      vercelAdapter.createDeployment.mockResolvedValue({
        id: 'dpl_1',
        url: 'x.vercel.app',
        projectName: 'x',
        readyState: 'QUEUED',
        errorMessage: null,
      });
      await provider.deploy({ files: [], projectName: 'x', environment: 'preview' });
      expect(vercelAdapter.createDeployment).toHaveBeenCalledWith(
        expect.objectContaining({ target: 'staging' }),
      );
    });

    it('does not double-prefix a url that already has a protocol', async () => {
      vercelAdapter.createDeployment.mockResolvedValue({
        id: 'dpl_1',
        url: 'https://my-app.vercel.app',
        projectName: 'my-app',
        readyState: 'QUEUED',
        errorMessage: null,
      });
      const result = await provider.deploy({
        files: [],
        projectName: 'my-app',
        environment: 'production',
      });
      expect(result.liveUrl).toBe('https://my-app.vercel.app');
    });
  });

  describe('getStatus', () => {
    it('maps QUEUED/BUILDING to "building" with no liveUrl yet', async () => {
      vercelAdapter.getDeployment.mockResolvedValue({
        id: 'dpl_1',
        url: 'x.vercel.app',
        projectName: 'x',
        readyState: 'BUILDING',
        errorMessage: null,
      });
      const result = await provider.getStatus('dpl_1');
      expect(result).toEqual({ status: 'building', liveUrl: null, errorMessage: null });
    });

    it('maps READY to "ready" with a liveUrl', async () => {
      vercelAdapter.getDeployment.mockResolvedValue({
        id: 'dpl_1',
        url: 'x.vercel.app',
        projectName: 'x',
        readyState: 'READY',
        errorMessage: null,
      });
      const result = await provider.getStatus('dpl_1');
      expect(result).toEqual({
        status: 'ready',
        liveUrl: 'https://x.vercel.app',
        errorMessage: null,
      });
    });

    it('maps ERROR/CANCELED to "error" and surfaces the error message', async () => {
      vercelAdapter.getDeployment.mockResolvedValue({
        id: 'dpl_1',
        url: 'x.vercel.app',
        projectName: 'x',
        readyState: 'ERROR',
        errorMessage: 'Build failed',
      });
      const result = await provider.getStatus('dpl_1');
      expect(result).toEqual({ status: 'error', liveUrl: null, errorMessage: 'Build failed' });
    });
  });

  describe('attachDomain', () => {
    it('resolves the owning project name from the deployment before attaching', async () => {
      vercelAdapter.getDeployment.mockResolvedValue({
        id: 'dpl_1',
        url: 'x.vercel.app',
        projectName: 'my-app',
        readyState: 'READY',
        errorMessage: null,
      });
      vercelAdapter.attachDomain.mockResolvedValue({
        name: 'example.com',
        verified: false,
        verification: [{ type: 'TXT', domain: 'example.com', value: 'abc', reason: 'pending' }],
      });

      const result = await provider.attachDomain('dpl_1', 'example.com');

      expect(vercelAdapter.attachDomain).toHaveBeenCalledWith('my-app', 'example.com');
      expect(result.verified).toBe(false);
      expect(result.verificationRecord).toEqual({
        verification: [{ type: 'TXT', domain: 'example.com', value: 'abc', reason: 'pending' }],
      });
    });

    it('returns verified=true and a null verificationRecord once Vercel reports the domain verified', async () => {
      vercelAdapter.getDeployment.mockResolvedValue({
        id: 'dpl_1',
        url: 'x.vercel.app',
        projectName: 'my-app',
        readyState: 'READY',
        errorMessage: null,
      });
      vercelAdapter.attachDomain.mockResolvedValue({
        name: 'example.com',
        verified: true,
        verification: [],
      });

      const result = await provider.attachDomain('dpl_1', 'example.com');

      expect(result.verified).toBe(true);
      expect(result.verificationRecord).toBeNull();
    });
  });
});
