import { Injectable } from '@nestjs/common';
import { BusinessService } from '../business/business.service';
import {
  LeadNotFoundException,
  BusinessNotFoundException,
} from '../common/exceptions/app.exception';
import { LeadsService } from '../leads/leads.service';
import { CustomSiteService } from './custom-site.service';
import { buildDraft, waLink, type DraftInput, type DraftOutput } from './proposal-templates';

export interface OutreachView {
  leadId: string;
  business: {
    name: string;
    category: string;
    city: string;
    address: string;
    phone: string | null;
    rating: number | null;
    reviewCount: number | null;
    googleBusinessUrl: string | null;
    telLink: string | null;
    whatsappLink: string | null;
    mapsLink: string;
  };
  liveUrl: string | null;
  deploymentStatus: string | null;
  shareLinks: { whatsapp: string | null; mailto: string | null };
}

@Injectable()
export class OutreachService {
  constructor(
    private readonly leads: LeadsService,
    private readonly businesses: BusinessService,
    private readonly sites: CustomSiteService,
  ) {}

  private async load(leadId: string) {
    const lead = await this.leads.findById(leadId);
    if (!lead) throw new LeadNotFoundException();
    const business = await this.businesses.findById(lead.businessId);
    if (!business) throw new BusinessNotFoundException();
    return { lead, business };
  }

  async get(leadId: string): Promise<OutreachView> {
    const { lead, business } = await this.load(leadId);
    const { liveUrl, status } = await this.sites.bestLiveUrl(lead.businessId);
    const phone = business.phone ?? null;
    const shareText = liveUrl
      ? `Assalam o Alaikum! ${business.businessName} ke liye demo website: ${liveUrl}`
      : '';
    const digits = phone ? phone.replace(/[^\d+]/g, '') : '';
    return {
      leadId,
      business: {
        name: business.businessName,
        category: business.category,
        city: business.city,
        address: business.address,
        phone,
        rating: business.rating ?? null,
        reviewCount: business.reviewCount ?? null,
        googleBusinessUrl: business.googleBusinessUrl ?? null,
        telLink: digits ? `tel:${digits}` : null,
        whatsappLink: waLink(phone, ''),
        mapsLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${business.businessName} ${business.address}`)}`,
      },
      liveUrl,
      deploymentStatus: status,
      shareLinks: {
        whatsapp: shareText ? waLink(phone, shareText) : null,
        mailto: liveUrl
          ? `mailto:?subject=${encodeURIComponent(`Demo website for ${business.businessName}`)}&body=${encodeURIComponent(liveUrl)}`
          : null,
      },
    };
  }

  async draft(
    leadId: string,
    params: Pick<DraftInput, 'language' | 'channel' | 'offer'>,
    senderName: string | null,
  ): Promise<DraftOutput & { whatsappLink: string | null }> {
    const { lead, business } = await this.load(leadId);
    const { liveUrl } = await this.sites.bestLiveUrl(lead.businessId);
    const out = buildDraft({
      ...params,
      businessName: business.businessName,
      city: business.city,
      category: business.category,
      rating: business.rating ?? null,
      reviewCount: business.reviewCount ?? null,
      liveUrl,
      senderName,
    });
    return { ...out, whatsappLink: waLink(business.phone ?? null, out.content) };
  }
}
