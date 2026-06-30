// Libs for third party
import { Command, END } from "@langchain/langgraph";

// Internal
import {
  PLACEHOLDERS,
  PROMPTS,
  STATUS,
  formatClassified,
} from "../../constants/messages";
import { getChatModel } from "../../lib/model";
import { EmailClassificationSchema } from "../types";

// Types
import type { EmailAgentStateType } from "../state";

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
    return new Command({
      goto: END,
      update: { status: STATUS.SKIPPED_NO_EMAIL },
    });
  }

  const model = getChatModel().withStructuredOutput(EmailClassificationSchema);

  const classification = await model.invoke(
    PROMPTS.CLASSIFY_INTENT(
      state.subject ?? PLACEHOLDERS.UNKNOWN,
      state.senderEmail ?? PLACEHOLDERS.UNKNOWN,
      state.emailContent,
    ),
  );

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
      status: STATUS.CLASSIFIED,
      steps: [formatClassified(classification.intent, classification.urgency)],
    },
    goto,
  });
};
