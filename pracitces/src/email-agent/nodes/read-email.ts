import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import type { EmailStateType, EmailConfigurable } from "../state.js";
import { fetchEmailById, fetchLatestUnread } from "../integrations/gmail.js";

/** Read Email: pull the target message from Gmail and parse it. */
export async function readEmail(
  _state: EmailStateType,
  config: LangGraphRunnableConfig,
): Promise<Partial<EmailStateType>> {
  const { emailId } = (config.configurable ?? {}) as EmailConfigurable;

  const email = emailId ? await fetchEmailById(emailId) : await fetchLatestUnread();
  if (!email) {
    throw new Error("No unread email found in the inbox.");
  }

  return { email, status: [`Read email: "${email.subject}" from ${email.from}`] };
}
