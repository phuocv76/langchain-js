// Libs for third party
import { HumanMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";

// Internal
import {
  PLACEHOLDERS,
  PROMPTS,
  STATUS,
  STEPS,
} from "../../constants/messages";
import { getChatModel } from "../../lib/model";

// Types
import type { EmailAgentStateType } from "../state";

/**
 * Drafts a reply using classification context and optional doc snippets.
 * When the reviewer requested edits, incorporates their feedback and clears
 * the prior decision before routing back to humanReview.
 *
 * @param state - Current graph state.
 */
export const draftReply = async (
  state: EmailAgentStateType,
): Promise<Command<"humanReview">> => {
  const classification = state.classification;
  const contextSections: string[] = [];
  const isRevision = state.decision?.action === "edit";

  if (state.searchResults.length > 0) {
    const formatted = state.searchResults.map((doc) => `- ${doc}`).join("\n");
    contextSections.push(
      `${PROMPTS.RELEVANT_DOCUMENTATION_HEADER}${formatted}`,
    );
  }

  const feedbackSection =
    isRevision && state.decision?.feedback
      ? PROMPTS.formatFeedbackSection(
          state.responseText ?? PLACEHOLDERS.NONE,
          state.decision.feedback,
        )
      : "";

  const draftPrompt = PROMPTS.DRAFT_REPLY({
    subject: state.subject ?? PLACEHOLDERS.UNKNOWN,
    sender: state.senderEmail ?? PLACEHOLDERS.UNKNOWN,
    emailContent: state.emailContent ?? "",
    intent: classification?.intent ?? PLACEHOLDERS.UNKNOWN_INTENT,
    urgency: classification?.urgency ?? PLACEHOLDERS.MEDIUM_URGENCY,
    topic: classification?.topic ?? PLACEHOLDERS.GENERAL_TOPIC,
    contextSections: contextSections.join("\n\n"),
    feedbackSection,
  });

  const response = await getChatModel().invoke([new HumanMessage(draftPrompt)]);
  const responseText =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  return new Command({
    update: {
      responseText,
      status: STATUS.DRAFT_READY,
      decision: undefined,
      steps: [
        isRevision ? STEPS.DRAFT_REPLY_REVISED : STEPS.DRAFT_REPLY_GENERATED,
      ],
    },
    goto: "humanReview",
  });
};
