import type { EmailStateType } from "../state.js";
import { markAsRead, sendReply as sendGmailReply } from "../integrations/gmail.js";

/** Send Reply: dispatch the approved draft as a threaded Gmail reply. */
export async function sendReply(state: EmailStateType): Promise<Partial<EmailStateType>> {
  if (!state.email) throw new Error("sendReply requires an email in state.");
  if (!state.draft) throw new Error("sendReply requires a draft in state.");

  const messageId = await sendGmailReply({ original: state.email, body: state.draft });
  await markAsRead(state.email.id);

  return { sent: true, status: [`Send reply: dispatched (message ${messageId})`] };
}
