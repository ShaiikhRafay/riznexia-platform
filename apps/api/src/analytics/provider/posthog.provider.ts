import { Injectable } from '@nestjs/common';
import { UnimplementedAnalyticsProvider } from './unimplemented-analytics-provider.base';

@Injectable()
export class PostHogProvider extends UnimplementedAnalyticsProvider {
  readonly name = 'posthog' as const;
}
