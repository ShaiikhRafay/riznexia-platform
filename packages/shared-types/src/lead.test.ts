import { describe, expect, it } from 'vitest';
import {
  createLeadNoteSchema,
  createLeadSchema,
  leadActivitySchema,
  leadNoteSchema,
  leadSchema,
  leadTagSchema,
  leadTagsSchema,
  listLeadsQuerySchema,
  updateLeadSchema,
} from './lead';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';

describe('leadSchema', () => {
  const valid = {
    id: UUID_A,
    businessId: UUID_B,
    businessName: "Joe's Diner",
    category: 'restaurant',
    city: 'Karachi',
    address: '123 Main St',
    websiteStatus: 'none',
    pipelineStage: 'new',
    assignedTo: null,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('accepts a well-formed unassigned lead', () => {
    expect(leadSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts an assigned lead with tags', () => {
    const result = leadSchema.safeParse({
      ...valid,
      assignedTo: UUID_B,
      tags: ['priority', 'referral'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a websiteStatus outside the documented enum', () => {
    expect(leadSchema.safeParse({ ...valid, websiteStatus: 'unknown' }).success).toBe(false);
  });

  it('rejects a pipelineStage outside the documented enum', () => {
    expect(leadSchema.safeParse({ ...valid, pipelineStage: 'archived' }).success).toBe(false);
  });

  it('no longer carries a notes field (Module M4 moved notes to their own resource)', () => {
    const parsed = leadSchema.parse(valid);
    expect(parsed).not.toHaveProperty('notes');
  });
});

describe('leadTagSchema', () => {
  it('lowercases tags so VIP and vip are the same tag', () => {
    expect(leadTagSchema.parse('VIP')).toBe('vip');
  });

  it('trims surrounding whitespace', () => {
    expect(leadTagSchema.parse('  priority  ')).toBe('priority');
  });

  it.each(['hot-lead', 'q1_target', 'follow up', 'tier2'])('accepts %s', (tag) => {
    expect(leadTagSchema.safeParse(tag).success).toBe(true);
  });

  it.each(['', '   ', '-leading-hyphen', 'has/slash', 'has,comma', 'emoji🎉'])(
    'rejects %s',
    (tag) => {
      expect(leadTagSchema.safeParse(tag).success).toBe(false);
    },
  );

  it('rejects a tag over the length cap', () => {
    expect(leadTagSchema.safeParse('a'.repeat(33)).success).toBe(false);
  });

  it('caps the number of tags per lead', () => {
    const tooMany = Array.from({ length: 21 }, (_, i) => `tag${i}`);
    expect(leadTagsSchema.safeParse(tooMany).success).toBe(false);
  });
});

describe('createLeadSchema', () => {
  it('requires a businessId', () => {
    expect(createLeadSchema.safeParse({}).success).toBe(false);
  });

  it('accepts just a businessId', () => {
    expect(createLeadSchema.safeParse({ businessId: UUID_A }).success).toBe(true);
  });

  it('rejects a non-UUID businessId', () => {
    expect(createLeadSchema.safeParse({ businessId: 'not-a-uuid' }).success).toBe(false);
  });

  it('accepts an initial stage, assignment and tags', () => {
    const result = createLeadSchema.safeParse({
      businessId: UUID_A,
      pipelineStage: 'qualified',
      assignedTo: UUID_B,
      tags: ['inbound'],
    });
    expect(result.success).toBe(true);
  });
});

describe('updateLeadSchema', () => {
  it('rejects an empty body rather than treating it as a silent no-op', () => {
    expect(updateLeadSchema.safeParse({}).success).toBe(false);
  });

  it('accepts a single-field update', () => {
    expect(updateLeadSchema.safeParse({ pipelineStage: 'contacted' }).success).toBe(true);
  });

  it('distinguishes explicit null (unassign) from an omitted field', () => {
    const unassign = updateLeadSchema.parse({ assignedTo: null });
    expect(unassign).toHaveProperty('assignedTo', null);

    const untouched = updateLeadSchema.parse({ pipelineStage: 'won' });
    expect(untouched).not.toHaveProperty('assignedTo');
  });

  it('rejects unknown keys so a typo fails loudly instead of being dropped', () => {
    expect(updateLeadSchema.safeParse({ pipelinestage: 'won' }).success).toBe(false);
  });

  it('normalizes tag casing on update', () => {
    expect(updateLeadSchema.parse({ tags: ['Priority', 'VIP'] }).tags).toEqual(['priority', 'vip']);
  });
});

describe('createLeadNoteSchema', () => {
  it('rejects an empty or whitespace-only body', () => {
    expect(createLeadNoteSchema.safeParse({ body: '' }).success).toBe(false);
    expect(createLeadNoteSchema.safeParse({ body: '    ' }).success).toBe(false);
  });

  it('trims the body', () => {
    expect(createLeadNoteSchema.parse({ body: '  spoke to owner  ' }).body).toBe('spoke to owner');
  });

  it('rejects a body over the length cap', () => {
    expect(createLeadNoteSchema.safeParse({ body: 'a'.repeat(5001) }).success).toBe(false);
  });
});

describe('leadNoteSchema', () => {
  it('accepts a note whose author has been offboarded (null authorId)', () => {
    const result = leadNoteSchema.safeParse({
      id: UUID_A,
      leadId: UUID_B,
      authorId: null,
      body: 'Migrated from the pre-M4 notes column',
      createdAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });
});

describe('leadActivitySchema', () => {
  const valid = {
    id: UUID_A,
    leadId: UUID_B,
    actorId: null,
    type: 'stage_changed',
    detail: { from: 'new', to: 'qualified' },
    createdAt: new Date().toISOString(),
  };

  it('accepts a well-formed activity entry', () => {
    expect(leadActivitySchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a null detail', () => {
    expect(leadActivitySchema.safeParse({ ...valid, detail: null }).success).toBe(true);
  });

  it('rejects an activity type outside the documented enum', () => {
    expect(leadActivitySchema.safeParse({ ...valid, type: 'exported' }).success).toBe(false);
  });
});

describe('listLeadsQuerySchema', () => {
  it('defaults limit to 25', () => {
    expect(listLeadsQuerySchema.parse({}).limit).toBe(25);
  });

  it('coerces a string limit from query params', () => {
    expect(listLeadsQuerySchema.parse({ limit: '10' }).limit).toBe(10);
  });

  it('rejects a limit above 100', () => {
    expect(listLeadsQuerySchema.safeParse({ limit: '500' }).success).toBe(false);
  });

  it('accepts a sort param as a free string (whitelisted in the service, per Doc 19)', () => {
    expect(listLeadsQuerySchema.parse({ sort: '-createdAt' }).sort).toBe('-createdAt');
  });

  it('normalizes a tag filter to lowercase', () => {
    expect(listLeadsQuerySchema.parse({ tag: 'Priority' }).tag).toBe('priority');
  });

  it('rejects a 1-character search term', () => {
    expect(listLeadsQuerySchema.safeParse({ q: 'a' }).success).toBe(false);
  });
});
