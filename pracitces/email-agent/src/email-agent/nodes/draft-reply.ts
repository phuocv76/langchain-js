// Libs for third party
import { HumanMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";

// Internal
import { getChatModel } from "../../lib/model.js";

// Types
import type { EmailAgentStateType } from "../state.js";

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
    contextSections.push(`Relevant documentation:\n${formatted}`);
  }

  const feedbackSection =
    isRevision && state.decision?.feedback
      ? `
Previous draft:
${state.responseText ?? "(none)"}

Reviewer feedback (revise accordingly):
${state.decision.feedback}
`
      : "";

  const draftPrompt = `
Draft a professional reply to this customer email:

Subject: ${state.subject ?? "(unknown)"}
From: ${state.senderEmail ?? "(unknown)"}
Email:
${state.emailContent ?? ""}

Intent: ${classification?.intent ?? "unknown"}
Urgency: ${classification?.urgency ?? "medium"}
Topic: ${classification?.topic ?? "general"}

${contextSections.join("\n\n")}
${feedbackSection}

Guidelines:
- Be concise, helpful, and professional
- Address the customer's specific concern
- Reference documentation when relevant
- Do not invent ticket numbers or policies not provided in context
`;

  const response = await getChatModel().invoke([new HumanMessage(draftPrompt)]);
  const responseText =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  return new Command({
    update: {
      responseText,
      status: "draft_ready",
      decision: undefined,
      steps: [
        isRevision
          ? "Draft reply: revised per reviewer feedback"
          : "Draft reply: generated",
      ],
    },
    goto: "humanReview",
  });
};
