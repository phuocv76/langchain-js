// Libs for third party
import { z } from "zod";

/** Structured news summary returned after search and analysis. */
export const NewsSummarySchema = z.object({
  title: z.string().describe("Headline for the top story or topic cluster"),
  summary: z.string().describe("Concise summary of the latest AI news"),
  impact: z.string().describe("Why this matters for practitioners or industry"),
});

export type NewsSummary = z.infer<typeof NewsSummarySchema>;
