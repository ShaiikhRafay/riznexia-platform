import { Injectable } from '@nestjs/common';
import { UnimplementedDeploymentProvider } from './unimplemented-deployment-provider.base';

@Injectable()
export class NetlifyProvider extends UnimplementedDeploymentProvider {
  readonly name = 'netlify' as const;
}
