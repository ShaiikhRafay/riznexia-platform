import { LeadActivityType as PrismaLeadActivityType } from '@riznexia/db';
import { toApiLeadActivityType, toPrismaLeadActivityType } from './lead-activity.mapper';

describe('lead-activity.mapper', () => {
  it.each([
    [PrismaLeadActivityType.CREATED, 'created'],
    [PrismaLeadActivityType.STAGE_CHANGED, 'stage_changed'],
    [PrismaLeadActivityType.ASSIGNED, 'assigned'],
    [PrismaLeadActivityType.UNASSIGNED, 'unassigned'],
    [PrismaLeadActivityType.NOTE_ADDED, 'note_added'],
    [PrismaLeadActivityType.TAGS_CHANGED, 'tags_changed'],
    [PrismaLeadActivityType.DELETED, 'deleted'],
  ] as const)('maps Prisma type %s to API type %s', (prismaType, apiType) => {
    expect(toApiLeadActivityType(prismaType)).toBe(apiType);
  });

  it('round-trips every activity type without loss', () => {
    for (const type of Object.values(PrismaLeadActivityType)) {
      expect(toPrismaLeadActivityType(toApiLeadActivityType(type))).toBe(type);
    }
  });
});
