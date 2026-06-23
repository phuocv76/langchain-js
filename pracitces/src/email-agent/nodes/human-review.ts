import { interrupt, type LangGraphRunnableConfig } from "@langchain/langgraph";
import type { EmailStateType, EmailConfigurable } from "../state.js";
import type { ReviewDecision } from "../types.js";

/**
 * Human Review: pause for a human to approve, edit, or reject the draft.
 *
 * - Phase 1 CLI passes `autoApprove: true` and the node approves without pausing.
 * - Otherwise it calls interrupt(), suspending the run until resumed with a
 *   ReviewDecision via `new Command({ resume })`.
 */
export async function humanReview(
  state: EmailStateType,
  config: LangGraphRunnableConfig,
): Promise<Partial<EmailStateType>> {
  const { autoApprove } = (config.configurable ?? {}) as EmailConfigurable;

  if (autoApprove) {
    return { decision: { action: "approve" }, status: ["Human review: auto-approved"] };
  }

  const raw = interrupt<
    { draft: string; email: EmailStateType["email"] },
    ReviewDecision | string
  >({
    draft: state.draft,
    email: state.email,
  });

  // CLI resumes with a ReviewDecision object; the CopilotKit UI resumes with a
  // JSON string (useLangGraphInterrupt's resolve only accepts strings).
  const decision: ReviewDecision = typeof raw === "string" ? JSON.parse(raw) : raw;

  return { decision, status: [`Human review: ${decision.action}`] };
}
