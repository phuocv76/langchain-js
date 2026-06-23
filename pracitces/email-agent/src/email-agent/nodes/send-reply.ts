// Internal
import { markEmailAsRead, sendEmailReply } from "../integrations/gmail.js";

// Types
import type { EmailAgentStateType } from "../state.js";

/**
 * Sends the approved reply via Gmail and marks the message read.
 *
 * @param state - Current graph state.
 */
export const sendReply = async (
  state: EmailAgentStateType,
): Promise<Partial<EmailAgentStateType>> => {
  if (!state.responseText || !state.threadId || !state.senderEmail) {
    return {
      status: "send_skipped_missing_fields",
      steps: ["Send reply: skipped — missing required fields"],
    };
  }

  const to = state.senderEmail.match(/<([^>]+)>/)?.[1] ?? state.senderEmail;

  await sendEmailReply({
    threadId: state.threadId,
    to,
    subject: state.subject ?? "Your message",
    body: state.responseText,
  });

  if (!state.emailId) {
    return {
      status: "reply_sent_mark_unread",
      steps: ["Send reply: dispatched (could not mark read — missing email id)"],
    };
  }

  await markEmailAsRead(state.emailId);

  return {
    status: "reply_sent",
    steps: ["Send reply: dispatched and marked read in Gmail"],
  };
};
