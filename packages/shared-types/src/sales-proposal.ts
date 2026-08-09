import { z } from 'zod';

// Module M10 (DECISIONS.md D-085) — Proposal Engine. Mirrors the
// `ProposalStatus` Prisma enum, lowercase per this package's casing
// split. `edited` is kept in the schema (the enum value is never
// removed once shipped) but is never produced by any M10 code path —
// immutable version history (founder's Decision 7) means "editing"
// creates a new `SalesProposal` row/version, never transitions an
// existing one.
export const PROPOSAL_STATUSES = [
  'draft',
  'edited',
  'sent_manually',
  'viewed',
  'accepted',
  'rejected',
] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

// The only statuses a rep can ever explicitly set via the API — `draft`
// is the fixed starting status every new version gets at creation, and
// `edited` is never produced (see above), so neither is a valid PATCH
// target.
export const SETTABLE_PROPOSAL_STATUSES = [
  'sent_manually',
  'viewed',
  'accepted',
  'rejected',
] as const;
export type SettableProposalStatus = (typeof SETTABLE_PROPOSAL_STATUSES)[number];

export const salesProposalSchema = z.object({
  id: z.string().uuid(),
  leadId: z.string().uuid(),
  version: z.number().int().positive(),
  content: z.string().nullable(),
  status: z.enum(PROPOSAL_STATUSES),
  sentAt: z.string().datetime().nullable(),
  viewedAt: z.string().datetime().nullable(),
  acceptedAt: z.string().datetime().nullable(),
  rejectedAt: z.string().datetime().nullable(),
  createdById: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type SalesProposal = z.infer<typeof salesProposalSchema>;

export const PROPOSAL_CONTENT_MAX_LENGTH = 20000;

// Creates a new, immutable version — `version` is computed server-side
// (max existing version for this lead + 1), never client-supplied
// (founder's Decision 7: never overwrite proposal versions).
export const createSalesProposalSchema = z.object({
  content: z.string().trim().min(1).max(PROPOSAL_CONTENT_MAX_LENGTH).optional(),
});
export type CreateSalesProposalInput = z.infer<typeof createSalesProposalSchema>;

// PATCH /leads/:id/proposals/:proposalId — status/tracking fields only.
// There is deliberately no way to change `content`/`version` through
// this endpoint or any other — immutability is enforced by the service
// never exposing an update path for those two fields, not by a
// convention a caller could bypass.
export const updateSalesProposalStatusSchema = z.object({
  status: z.enum(SETTABLE_PROPOSAL_STATUSES),
});
export type UpdateSalesProposalStatusInput = z.infer<typeof updateSalesProposalStatusSchema>;

export const listSalesProposalsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListSalesProposalsQuery = z.infer<typeof listSalesProposalsQuerySchema>;
