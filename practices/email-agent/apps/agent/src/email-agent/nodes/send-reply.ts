// Libs for third party
import { AIMessage } from '@langchain/core/messages';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { copilotkitEmitMessage } from '@copilotkit/sdk-js/langgraph';

// Internal
import { PLACEHOLDERS, STATUS, STEPS, UI } from '../../constants/messages';
import { markEmailAsRead, sendEmailReply } from '../integrations/gmail';

// Types
import type { EmailAgentStateType } from '../state';

/**
 * Sends the approved reply via Gmail and marks the message read.
 *
 * @param state - Current graph state.
 * @param config - LangGraph config used to emit a success message to CopilotKit.
 */
export const sendReply = async (
  state: EmailAgentStateType,
  config: LangGraphRunnableConfig,
): Promise<Partial<EmailAgentStateType>> => {
  if (!state.responseText || !state.threadId || !state.senderEmail) {
    return {
      status: STATUS.SEND_SKIPPED_MISSING_FIELDS,
      steps: [STEPS.SEND_REPLY_SKIPPED],
    };
  }

  const to = state.senderEmail.match(/<([^>]+)>/)?.[1] ?? state.senderEmail;
  const subject = state.subject ?? PLACEHOLDERS.DEFAULT_REPLY_SUBJECT;

  await sendEmailReply({
    threadId: state.threadId,
    to,
    subject,
    body: state.responseText,
  });

  const successMessage = UI.formatReplySent(to, subject);
  await copilotkitEmitMessage(config, successMessage);

  if (!state.emailId) {
    return {
      status: STATUS.REPLY_SENT_MARK_UNREAD,
      steps: [STEPS.SEND_REPLY_DISPATCHED_NO_MARK],
      messages: [new AIMessage({ content: successMessage })],
    };
  }

  await markEmailAsRead(state.emailId);

  return {
    status: STATUS.REPLY_SENT,
    steps: [STEPS.SEND_REPLY_SUCCESS],
    messages: [new AIMessage({ content: successMessage })],
  };
};
