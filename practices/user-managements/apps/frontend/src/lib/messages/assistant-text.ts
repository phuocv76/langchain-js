// Internal
import { stringifyMessageContent } from '../threads/title';

/** Resolves assistant text from message content and optional run state. */
export const resolveAssistantText = (
  content: unknown,
  stateSnapshot?: unknown,
): string => {
  const fromContent = stringifyMessageContent(content);
  if (fromContent) return fromContent;

  const messages = (stateSnapshot as { messages?: unknown[] } | undefined)
    ?.messages;
  if (!Array.isArray(messages)) return '';

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i] as {
      type?: string;
      role?: string;
      content?: unknown;
      kwargs?: { content?: unknown };
    };
    if (message.type !== 'ai' && message.role !== 'assistant') continue;
    const text = stringifyMessageContent(
      message.kwargs?.content ?? message.content,
    );
    if (text) return text;
  }
  return '';
};
