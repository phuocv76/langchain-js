/** Parses JSON tool output from string or object payloads. */
export const parseToolOutput = (content: unknown): unknown => {
  if (typeof content === 'string') {
    try {
      return JSON.parse(content);
    } catch {
      return content;
    }
  }
  return content;
};

export interface ExtractedToolResult {
  name: string;
  output: unknown;
}

type SerializedMessage = {
  id?: readonly string[];
  type?: string;
  role?: string;
  name?: string;
  kwargs?: {
    name?: string;
    content?: unknown;
    tool_call_id?: string;
  };
  content?: unknown;
};

const isToolMessage = (message: unknown): boolean => {
  if (!message || typeof message !== 'object') return false;
  const record = message as SerializedMessage;
  if (record.type === 'tool' || record.role === 'tool') return true;
  return record.id?.at(-1) === 'ToolMessage';
};

const isHumanMessage = (message: unknown): boolean => {
  if (!message || typeof message !== 'object') return false;
  const record = message as SerializedMessage;
  if (record.type === 'human' || record.role === 'user') return true;
  return record.id?.at(-1) === 'HumanMessage';
};

/** Index of the last human message in a LangGraph state transcript. */
const findLastHumanMessageIndex = (messages: readonly unknown[]): number => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (isHumanMessage(messages[i])) return i;
  }
  return -1;
};

const readToolName = (message: SerializedMessage): string | null => {
  if (typeof message.name === 'string') return message.name;
  if (typeof message.kwargs?.name === 'string') return message.kwargs.name;
  return null;
};

const readToolContent = (message: SerializedMessage): unknown =>
  message.kwargs?.content ?? message.content;

/**
 * Extracts completed tool results from a LangGraph state snapshot.
 *
 * @param stateSnapshot - Agent state from CopilotKit for the current run.
 */
export const extractToolResultsFromState = (
  stateSnapshot: unknown,
): ExtractedToolResult[] => {
  const messages = (stateSnapshot as { messages?: unknown[] } | undefined)
    ?.messages;
  if (!Array.isArray(messages)) return [];

  const lastHumanIdx = findLastHumanMessageIndex(messages);

  const results: ExtractedToolResult[] = [];
  for (let i = 0; i < messages.length; i += 1) {
    if (lastHumanIdx >= 0 && i <= lastHumanIdx) continue;
    const message = messages[i];
    if (!isToolMessage(message)) continue;
    const record = message as SerializedMessage;
    const name = readToolName(record);
    if (!name) continue;
    results.push({
      name,
      output: parseToolOutput(readToolContent(record)),
    });
  }
  return results;
};
