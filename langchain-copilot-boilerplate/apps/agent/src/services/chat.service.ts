// Libs for third party
import { randomUUID } from 'node:crypto';
import {
  HumanMessage,
  isAIMessageChunk,
  type BaseMessage,
  type BaseMessageChunk,
} from '@langchain/core/messages';

// Internal
import { compileWithMemory } from '@agent/agents/default-agent/index.js';

let cachedGraph: ReturnType<typeof compileWithMemory> | undefined;

/** Lazily compiles the in-process graph used by the REST chat endpoint. */
const getChatGraph = (): ReturnType<typeof compileWithMemory> => {
  cachedGraph ??= compileWithMemory();
  return cachedGraph;
};

interface StreamChatOptions {
  readonly message: string;
  readonly threadId?: string;
}

/**
 * Streams assistant tokens for a single user message.
 *
 * Uses LangGraph `streamMode: 'messages'` and yields only AI text chunks so the
 * caller can forward them over Server-Sent Events.
 *
 * @returns An async generator of text tokens.
 */
export const streamChatTokens = async function* ({
  message,
  threadId,
}: StreamChatOptions): AsyncGenerator<string> {
  const graph = getChatGraph();
  const config = {
    configurable: { thread_id: threadId ?? randomUUID() },
    streamMode: 'messages' as const,
  };

  const stream = await graph.stream(
    { messages: [new HumanMessage(message)] as BaseMessage[] },
    config,
  );

  for await (const [message] of stream as AsyncIterable<
    [BaseMessageChunk, unknown]
  >) {
    if (
      isAIMessageChunk(message) &&
      typeof message.content === 'string' &&
      message.content.length > 0
    ) {
      yield message.content;
    }
  }
};
