'use client';

import { useAuth } from '@clerk/nextjs';
import { leadNoteSchema, type CreateLeadNoteInput, type LeadNote } from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

export interface CreateLeadNoteVariables {
  leadId: string;
  input: CreateLeadNoteInput;
}

// Notes are append-only (`POST /leads/:id/notes`) — there is deliberately
// no update/delete mutation anywhere in this feature, matching the
// backend's own "no update or delete path" for `LeadNote` exactly.
// Invalidates both the notes list and the activity timeline, since adding
// a note also writes a `note_added` activity entry server-side.
export function useCreateLeadNote(): UseMutationResult<LeadNote, unknown, CreateLeadNoteVariables> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, input }: CreateLeadNoteVariables) => {
      const token = await getToken();
      return apiClient.post<LeadNote>(`/leads/${leadId}/notes`, input, {
        token,
        schema: leadNoteSchema,
      });
    },
    onSuccess: (_data, { leadId }) => {
      void queryClient.invalidateQueries({ queryKey: ['leads', leadId, 'notes'] });
      void queryClient.invalidateQueries({ queryKey: ['leads', leadId, 'activity'] });
    },
  });
}
