// Libs for third party
import { z } from "zod";

/** Structured classification produced by the classifyIntent node. */
export const EmailClassificationSchema = z.object({
  intent: z.enum(["question", "feature", "bug", "billing", "complex", "other"]),
  urgency: z.enum(["low", "medium", "high", "critical"]),
  topic: z.string(),
  summary: z.string(),
});

export type EmailClassification = z.infer<typeof EmailClassificationSchema>;

/** Parsed Gmail message used by the workflow. */
export interface EmailMessage {
  readonly id: string;
  readonly threadId: string;
  readonly from: string;
  readonly subject: string;
  readonly body: string;
}

/** Human review decision (JSON-serializable for CopilotKit resume). */
export interface ReviewDecision {
  readonly action: "approve" | "reject" | "edit";
  /** Direct replacement text from the review UI (skips re-draft). */
  readonly editedResponse?: string;
  /** Guidance for the draft node to regenerate the reply. */
  readonly feedback?: string;
}
