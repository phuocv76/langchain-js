// Libs for third party
import { AIMessage } from "@langchain/core/messages";
import { Command, END, interrupt } from "@langchain/langgraph";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";

// Types
import type { WarrantyAgentStateType } from "../state";
import type { WarrantyReviewDecision } from "../schemas/warranty";

/** Parses CopilotKit resume payloads (string or object). */
const parseReviewDecision = (value: unknown): WarrantyReviewDecision => {
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
        action: record.action as WarrantyReviewDecision["action"],
        editedResponse:
          typeof record.editedResponse === "string"
            ? record.editedResponse
            : undefined,
        feedback:
          typeof record.feedback === "string" ? record.feedback : undefined,
      };
    }
  }

  return { action: "approve" };
};

/** Extracts the latest assistant text from message history. */
const latestAssistantText = (state: WarrantyAgentStateType): string => {
  const lastAi = [...state.messages]
    .reverse()
    .find((message) => AIMessage.isInstance(message));

  if (!lastAi) {
    return "No recommendation was generated.";
  }

  return typeof lastAi.content === "string"
    ? lastAi.content
    : JSON.stringify(lastAi.content);
};

/**
 * Pauses for human approval on high-risk warranty outcomes.
 *
 * @param state - Current graph state.
 * @param config - Runnable config with optional autoApprove flag.
 */
export const humanReview = async (
  state: WarrantyAgentStateType,
  config: LangGraphRunnableConfig,
): Promise<Command<typeof END>> => {
  const autoApprove = Boolean(config.configurable?.autoApprove);
  const draft = state.finalResponse ?? latestAssistantText(state);

  let decision: WarrantyReviewDecision;

  if (autoApprove) {
    decision = { action: "approve" };
  } else {
    const rawDecision = interrupt({
      product: state.assessment?.product,
      isUnderWarranty: state.assessment?.isUnderWarranty,
      estimatedCost: state.assessment?.estimatedCost,
      reasoning: state.assessment?.reasoning,
      recommendedAction: state.assessment?.recommendedAction,
      draftResponse: draft,
      action: "Review warranty recommendation before sending to customer",
    });
    decision = parseReviewDecision(rawDecision);
  }

  if (decision.action === "reject") {
    return new Command({
      update: {
        finalResponse:
          "Your warranty request was reviewed and could not be approved.",
        steps: ["human_review_rejected"],
      },
      goto: END,
    });
  }

  const approvedText =
    decision.action === "edit" && decision.editedResponse
      ? decision.editedResponse
      : draft;

  return new Command({
    update: {
      finalResponse: approvedText,
      steps: ["human_review_approved"],
    },
    goto: END,
  });
};
