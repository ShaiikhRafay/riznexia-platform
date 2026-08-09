import { Injectable } from '@nestjs/common';
import { UnimplementedDeploymentProvider } from './unimplemented-deployment-provider.base';

@Injectable()
export class AwsAmplifyProvider extends UnimplementedDeploymentProvider {
  readonly name = 'aws_amplify' as const;
}
