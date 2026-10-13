import { Module } from '@nestjs/common';
import { BriefModule } from '../brief-engine/brief.module';
import { BusinessModule } from '../business/business.module';
import { ProviderModule } from '../deployment/provider/provider.module';
import { LeadsModule } from '../leads/leads.module';
import { CustomSiteController } from './custom-site.controller';
import { CustomSiteService } from './custom-site.service';
import { OutreachController } from './outreach.controller';
import { OutreachService } from './outreach.service';

// Build Pack download, site.zip upload, Vercel deploy, Outreach + proposal
// drafts. Needs BriefService exported from BriefModule (see brief.module.ts).
@Module({
  imports: [BriefModule, BusinessModule, LeadsModule, ProviderModule],
  controllers: [CustomSiteController, OutreachController],
  providers: [CustomSiteService, OutreachService],
})
export class CustomSiteModule {}
