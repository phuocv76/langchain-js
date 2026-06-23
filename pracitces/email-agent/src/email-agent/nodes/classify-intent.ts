// Libs for third party
import { Command, END } from "@langchain/langgraph";

// Internal
import { getChatModel } from "../../lib/model.js";
import { EmailClassificationSchema } from "../types.js";

// Types
import type { EmailAgentStateType } from "../state.js";

type RouteTarget = "docSearch" | "bugTrack" | "draftReply";

/**
 * Classifies email intent with structured output and routes to the next node.
 *
 * @param state - Current graph state.
 */
export const classifyIntent = async (
  state: EmailAgentStateType,
): Promise<Command<RouteTarget | typeof END>> => {
  if (!state.emailContent) {
    return new Command({ goto: END, update: { status: "skipped_no_email" } });
  }

  const model = getChatModel().withStructuredOutput(EmailClassificationSchema);

  const classification = await model.invoke(`
Analyze this customer email and classify it:

Subject: ${state.subject ?? "(unknown)"}
From: ${state.senderEmail ?? "(unknown)"}
Email:
${state.emailContent}

Provide intent, urgency, topic, and a one-line summary.
`);

  let goto: RouteTarget = "draftReply";

  if (
    classification.intent === "question" ||
    classification.intent === "feature"
  ) {
    goto = "docSearch";
  } else if (classification.intent === "bug") {
    goto = "bugTrack";
  }

  return new Command({
    update: {
      classification,
      status: "classified",
      steps: [`Classified: ${classification.intent} (${classification.urgency})`],
    },
    goto,
  });
};
