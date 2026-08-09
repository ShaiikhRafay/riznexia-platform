import { Injectable } from '@nestjs/common';
import { UnimplementedAnalyticsProvider } from './unimplemented-analytics-provider.base';

@Injectable()
export class MixpanelProvider extends UnimplementedAnalyticsProvider {
  readonly name = 'mixpanel' as const;
}
