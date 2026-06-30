// Libs for third party
import type { LangGraphRunnableConfig } from "@langchain/langgraph";

// Internal
import {
  STATUS,
  STEPS,
  formatReadEmailLoaded,
} from "../../constants/messages";
import { fetchTargetEmail } from "../integrations/gmail";

// Types
import type { EmailAgentStateType } from "../state";

/**
 * Reads the target email from Gmail and returns partial state.
 *
 * @param state - Current graph state.
 * @param config - Runnable config; optional `emailId` in configurable.
 */
export const readEmail = async (
  _state: EmailAgentStateType,
  config: LangGraphRunnableConfig,
): Promise<Partial<EmailAgentStateType>> => {
  // Only honor an explicit configurable id. Ignore checkpointed state.emailId so
  // each new run from START picks the latest unread instead of a prior message.
  const emailId = config.configurable?.emailId as string | undefined;
  const email = await fetchTargetEmail(emailId);

  if (!email) {
    return {
      status: STATUS.NO_UNREAD_EMAIL,
      emailContent: undefined,
      steps: [STEPS.READ_EMAIL_NO_UNREAD],
    };
  }

  return {
    emailId: email.id,
    threadId: email.threadId,
    senderEmail: email.from,
    subject: email.subject,
    emailContent: email.body,
    status: STATUS.EMAIL_LOADED,
    steps: [formatReadEmailLoaded(email.subject, email.from)],
  };
};
