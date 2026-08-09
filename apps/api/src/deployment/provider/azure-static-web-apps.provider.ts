import { Injectable } from '@nestjs/common';
import { UnimplementedDeploymentProvider } from './unimplemented-deployment-provider.base';

@Injectable()
export class AzureStaticWebAppsProvider extends UnimplementedDeploymentProvider {
  readonly name = 'azure_static_web_apps' as const;
}
