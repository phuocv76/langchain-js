// Libs for third party
import { Command, END, interrupt } from "@langchain/langgraph";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";

// Types
import type { EmailAgentStateType } from "../state.js";
import type { ReviewDecision } from "../types.js";

/** Parses CopilotKit resume payloads (string or object). */
const parseReviewDecision = (value: unknown): ReviewDecision => {
  if (typeof value === "string") {
    try {
      return parseReviewDecision(JSON.parse(value));
    } catch {
      return { action: "approve", editedResponse: value };
    }
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.action === "string") {
      return {
        action: record.action as ReviewDecision["action"],
        editedResponse:
          typeof record.editedResponse === "string"
            ? record.editedResponse
            : undefined,
        feedback:
          typeof record.feedback === "string" ? record.feedback : undefined,
      };
    }
    if (typeof record.approved === "boolean") {
      if (!record.approved) {
        return { action: "reject" };
      }
      return {
        action: typeof record.editedResponse === "string" ? "edit" : "approve",
        editedResponse:
          typeof record.editedResponse === "string"
            ? record.editedResponse
            : undefined,
      };
    }
  }

  return { action: "approve" };
};

/**
 * Pauses for human review via `interrupt()` unless `configurable.autoApprove` is set.
 * Routes approve → sendReply, edit → draftReply (or sendReply when text is edited
 * inline), reject → END — matching the LangGraph approve/reject interrupt pattern.
 *
 * @param state - Current graph state.
 * @param config - Runnable config with optional autoApprove flag.
 */
export const humanReview = async (
  state: EmailAgentStateType,
  config: LangGraphRunnableConfig,
): Promise<Command<"sendReply" | "draftReply" | typeof END>> => {
  const autoApprove = Boolean(config.configurable?.autoApprove);

  let decision: ReviewDecision;

  if (autoApprove) {
    decision = { action: "approve" };
  } else {
    const rawDecision = interrupt({
      emailId: state.emailId,
      subject: state.subject,
      originalEmail: state.emailContent,
      draftResponse: state.responseText,
      urgency: state.classification?.urgency,
      intent: state.classification?.intent,
      action: "Review and approve, edit, or reject this draft reply.",
    });
    decision = parseReviewDecision(rawDecision);
  }

  if (decision.action === "reject") {
    return new Command({
      update: {
        status: "rejected_by_human",
        steps: ["Human review: rejected"],
      },
      goto: END,
    });
  }

  if (decision.action === "edit" && decision.editedResponse) {
    return new Command({
      update: {
        responseText: decision.editedResponse,
        status: "approved_by_human",
        steps: ["Human review: edited inline and approved"],
      },
      goto: "sendReply",
    });
  }

  if (decision.action === "edit") {
    return new Command({
      update: {
        decision,
        status: "draft_revision_requested",
        steps: ["Human review: edit requested — redrafting"],
      },
      goto: "draftReply",
    });
  }

  return new Command({
    update: {
      status: "approved_by_human",
      steps: ["Human review: approved"],
    },
    goto: "sendReply",
  });
};
