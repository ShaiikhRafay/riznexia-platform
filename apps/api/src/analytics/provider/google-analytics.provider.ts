import { Injectable } from '@nestjs/common';
import { UnimplementedAnalyticsProvider } from './unimplemented-analytics-provider.base';

@Injectable()
export class GoogleAnalyticsProvider extends UnimplementedAnalyticsProvider {
  readonly name = 'google_analytics' as const;
}
