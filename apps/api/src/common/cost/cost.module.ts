import { Global, Module } from '@nestjs/common';
import { CostService } from './cost.service';

// Global — cost governance is a cross-cutting concern every future
// cost-incurring module (AI generation, image-gen) will also need, not
// just discovery.
@Global()
@Module({
  providers: [CostService],
  exports: [CostService],
})
export class CostModule {}
