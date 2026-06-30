// Internal
import { stringifyMessageContent } from '../threads/title';

interface SerializedMessage {
  readonly type?: string;
  readonly role?: string;
  readonly content?: unknown;
  readonly id?: readonly string[];
}

/** Returns true when a serialized message is an assistant turn. */
const isAssistantMessage = (message: unknown): boolean => {
  if (!message || typeof message !== 'object') {
    return false;
  }

  const record = message as SerializedMessage;
  if (record.type === 'ai' || record.role === 'assistant') {
    return true;
  }

  return record.id?.at(-1) === 'AIMessage';
};

/** Reads plain text from a serialized LangGraph / AG-UI message. */
const textFromSerializedMessage = (message: unknown): string => {
  if (!message || typeof message !== 'object') {
    return '';
  }

  const record = message as SerializedMessage;
  return stringifyMessageContent(record.content);
};

/**
 * Resolves assistant text from chat content and optional run state.
 *
 * CopilotKit may leave `message.content` empty when a guardrail ends the run
 * before the model; the reply still lives on the last AI message in state.
 *
 * @param content - Raw assistant message content from CopilotKit.
 * @param stateSnapshot - Optional agent state for the current run.
 */
export const resolveAssistantText = (
  content: unknown,
  stateSnapshot?: unknown,
): string => {
  const fromContent = stringifyMessageContent(content);
  if (fromContent) {
    return fromContent;
  }

  const messages = (stateSnapshot as { messages?: unknown[] } | undefined)
    ?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return '';
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!isAssistantMessage(message)) {
      continue;
    }

    const text = textFromSerializedMessage(message);
    if (text) {
      return text;
    }
  }

  return '';
};
