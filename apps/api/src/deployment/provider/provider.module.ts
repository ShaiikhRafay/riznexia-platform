import { Module } from '@nestjs/common';
import { AwsAmplifyProvider } from './aws-amplify.provider';
import { CloudflarePagesProvider } from './cloudflare-pages.provider';
import { DEPLOYMENT_PROVIDER } from './deployment-provider.interface';
import { NetlifyProvider } from './netlify.provider';
import { VercelAdapter } from './vercel.adapter';
import { VercelProvider } from './vercel.provider';
import { AzureStaticWebAppsProvider } from './azure-static-web-apps.provider';

// Module M11 — the DI wiring point for the Deployment Provider
// abstraction, the exact structural mirror of ProvidersModule (M5).
// Every other deployment/* module imports this rather than each
// registering its own DEPLOYMENT_PROVIDER binding, so there is exactly
// one place that decides which concrete provider is active. Swapping in
// a future real CloudflarePagesProvider/NetlifyProvider/AwsAmplifyProvider/
// AzureStaticWebAppsProvider means changing the `useClass` line below —
// no consumer of DEPLOYMENT_PROVIDER changes.
@Module({
  providers: [
    VercelAdapter,
    VercelProvider,
    CloudflarePagesProvider,
    NetlifyProvider,
    AwsAmplifyProvider,
    AzureStaticWebAppsProvider,
    { provide: DEPLOYMENT_PROVIDER, useClass: VercelProvider },
  ],
  exports: [DEPLOYMENT_PROVIDER],
})
export class ProviderModule {}
