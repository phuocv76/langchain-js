import { z } from 'zod';

/** User decision when resuming a mutation interrupt. */
export const MutationReviewDecisionSchema = z.object({
  action: z.enum(['approve', 'reject', 'edit']),
  feedback: z.string().optional(),
});

export type MutationReviewDecision = z.infer<
  typeof MutationReviewDecisionSchema
>;
