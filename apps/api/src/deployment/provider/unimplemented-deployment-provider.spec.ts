import { AwsAmplifyProvider } from './aws-amplify.provider';
import { AzureStaticWebAppsProvider } from './azure-static-web-apps.provider';
import { CloudflarePagesProvider } from './cloudflare-pages.provider';
import type { DeploymentProvider } from './deployment-provider.interface';
import { NetlifyProvider } from './netlify.provider';

// Founder's explicit Decision 2 — each of these genuinely implements
// DeploymentProvider (provably pluggable via ProviderModule's useClass)
// but has no real adapter behind it yet.
describe.each([
  ['cloudflare_pages', () => new CloudflarePagesProvider()],
  ['netlify', () => new NetlifyProvider()],
  ['aws_amplify', () => new AwsAmplifyProvider()],
  ['azure_static_web_apps', () => new AzureStaticWebAppsProvider()],
])('%s provider (reserved, unimplemented)', (expectedName, factory) => {
  let provider: DeploymentProvider;

  beforeEach(() => {
    provider = factory();
  });

  it(`exposes name "${expectedName}"`, () => {
    expect(provider.name).toBe(expectedName);
  });

  it('reports isConfigured() as false', () => {
    expect(provider.isConfigured()).toBe(false);
  });

  it('rejects deploy() with a clear "reserved" error', async () => {
    await expect(
      provider.deploy({ files: [], projectName: 'x', environment: 'production' }),
    ).rejects.toThrow(/reserved for a future module/);
  });

  it('rejects getStatus() with a clear "reserved" error', async () => {
    await expect(provider.getStatus('id')).rejects.toThrow(/reserved for a future module/);
  });
});
