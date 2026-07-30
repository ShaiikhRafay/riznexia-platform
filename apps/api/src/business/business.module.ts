import { Module } from '@nestjs/common';
import { BusinessService } from './business.service';

@Module({
  providers: [BusinessService],
  exports: [BusinessService], // consumed by DiscoveryModule's write path
})
export class BusinessModule {}
