import { Injectable } from '@nestjs/common';
import { UnimplementedDeploymentProvider } from './unimplemented-deployment-provider.base';

@Injectable()
export class CloudflarePagesProvider extends UnimplementedDeploymentProvider {
  readonly name = 'cloudflare_pages' as const;
}
