import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService], // consumed by DiscoveryModule's write path (Doc 22 §14)
})
export class LeadsModule {}
