import { Injectable } from '@nestjs/common';
import { UnimplementedAnalyticsProvider } from './unimplemented-analytics-provider.base';

@Injectable()
export class AzureApplicationInsightsProvider extends UnimplementedAnalyticsProvider {
  readonly name = 'azure_application_insights' as const;
}
