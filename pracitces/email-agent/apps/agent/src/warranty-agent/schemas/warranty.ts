// Libs for third party
import { z } from "zod";

/** Warranty assessment returned to the customer after specialist review. */
export const WarrantyAssessmentSchema = z.object({
  product: z.string(),
  purchaseAgeMonths: z.number().optional(),
  isUnderWarranty: z.boolean(),
  reasoning: z.string(),
  recommendedAction: z.string(),
  estimatedCost: z.number().optional(),
  requiresHumanApproval: z.boolean().default(false),
});

export type WarrantyAssessment = z.infer<typeof WarrantyAssessmentSchema>;

/** Human reviewer decision for high-risk warranty outcomes. */
export const WarrantyReviewDecisionSchema = z.object({
  action: z.enum(["approve", "reject", "edit"]),
  editedResponse: z.string().optional(),
  feedback: z.string().optional(),
});

export type WarrantyReviewDecision = z.infer<
  typeof WarrantyReviewDecisionSchema
>;

/** Long-term customer profile persisted in the store. */
export interface CustomerProfile {
  readonly customerId: string;
  readonly products: readonly string[];
  readonly previousClaims: number;
  readonly notes?: string;
}
