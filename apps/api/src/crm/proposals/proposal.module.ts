import { Module } from '@nestjs/common';
import { LeadsModule } from '../../leads/leads.module';
import { PipelineModule } from '../pipeline/pipeline.module';
import { SalesProposalController } from './sales-proposal.controller';
import { SalesProposalService } from './sales-proposal.service';

// Module M10 — Proposal Engine. Imports `LeadsModule` for
// `LeadActivityService` (the `sent_manually` transition's PROPOSAL_SENT
// entry) and `PipelineModule` for `LeadCrmService` (the same
// `lastActivityAt` touch the Activity Engine performs). Exported for
// `ReportingModule` (founder's Decision 6).
@Module({
  imports: [LeadsModule, PipelineModule],
  controllers: [SalesProposalController],
  providers: [SalesProposalService],
  exports: [SalesProposalService],
})
export class ProposalModule {}
