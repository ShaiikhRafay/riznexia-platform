import { Injectable } from '@nestjs/common';
import { UnimplementedAnalyticsProvider } from './unimplemented-analytics-provider.base';

@Injectable()
export class DatadogProvider extends UnimplementedAnalyticsProvider {
  readonly name = 'datadog' as const;
}
