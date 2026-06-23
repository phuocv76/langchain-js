// Libs for third party
import type { LangGraphRunnableConfig } from "@langchain/langgraph";

// Internal
import { fetchTargetEmail } from "../integrations/gmail.js";

// Types
import type { EmailAgentStateType } from "../state.js";

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
      status: "no_unread_email",
      emailContent: undefined,
      steps: ["Read email: no unread messages in inbox"],
    };
  }

  return {
    emailId: email.id,
    threadId: email.threadId,
    senderEmail: email.from,
    subject: email.subject,
    emailContent: email.body,
    status: "email_loaded",
    steps: [`Read email: "${email.subject}" from ${email.from}`],
  };
};
