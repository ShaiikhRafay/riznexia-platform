import { LeadActivityType as PrismaLeadActivityType } from '@riznexia/db';
import type { LeadActivityType } from '@riznexia/shared-types';

// Same Prisma-uppercase / API-lowercase split as lead.mapper.ts and
// auth/team-member.mapper.ts — the one place the two casings meet.
// Module M10 (DECISIONS.md D-086): CALL/EMAIL/MEETING/WHATSAPP/
// WEBSITE_GENERATED/PREVIEW_SENT/PROPOSAL_SENT added — the Activity
// Engine (crm/activities/) reuses this exact mapper, not a parallel one.
const PRISMA_TO_API: Record<PrismaLeadActivityType, LeadActivityType> = {
  [PrismaLeadActivityType.CREATED]: 'created',
  [PrismaLeadActivityType.STAGE_CHANGED]: 'stage_changed',
  [PrismaLeadActivityType.ASSIGNED]: 'assigned',
  [PrismaLeadActivityType.UNASSIGNED]: 'unassigned',
  [PrismaLeadActivityType.NOTE_ADDED]: 'note_added',
  [PrismaLeadActivityType.TAGS_CHANGED]: 'tags_changed',
  [PrismaLeadActivityType.DELETED]: 'deleted',
  [PrismaLeadActivityType.CALL]: 'call',
  [PrismaLeadActivityType.EMAIL]: 'email',
  [PrismaLeadActivityType.MEETING]: 'meeting',
  [PrismaLeadActivityType.WHATSAPP]: 'whatsapp',
  [PrismaLeadActivityType.WEBSITE_GENERATED]: 'website_generated',
  [PrismaLeadActivityType.PREVIEW_SENT]: 'preview_sent',
  [PrismaLeadActivityType.PROPOSAL_SENT]: 'proposal_sent',
};

const API_TO_PRISMA: Record<LeadActivityType, PrismaLeadActivityType> = {
  created: PrismaLeadActivityType.CREATED,
  stage_changed: PrismaLeadActivityType.STAGE_CHANGED,
  assigned: PrismaLeadActivityType.ASSIGNED,
  unassigned: PrismaLeadActivityType.UNASSIGNED,
  note_added: PrismaLeadActivityType.NOTE_ADDED,
  tags_changed: PrismaLeadActivityType.TAGS_CHANGED,
  deleted: PrismaLeadActivityType.DELETED,
  call: PrismaLeadActivityType.CALL,
  email: PrismaLeadActivityType.EMAIL,
  meeting: PrismaLeadActivityType.MEETING,
  whatsapp: PrismaLeadActivityType.WHATSAPP,
  website_generated: PrismaLeadActivityType.WEBSITE_GENERATED,
  preview_sent: PrismaLeadActivityType.PREVIEW_SENT,
  proposal_sent: PrismaLeadActivityType.PROPOSAL_SENT,
};

export function toApiLeadActivityType(type: PrismaLeadActivityType): LeadActivityType {
  return PRISMA_TO_API[type];
}

export function toPrismaLeadActivityType(type: LeadActivityType): PrismaLeadActivityType {
  return API_TO_PRISMA[type];
}
