// Libs for Node
import { randomUUID } from 'node:crypto';

// Libs for third party
import {
  EventType,
  type BaseEvent,
  type Message,
  type MessagesSnapshotEvent,
  type RunAgentInput,
  type TextMessageChunkEvent,
  type ToolCallChunkEvent,
  type ToolCallResultEvent,
} from '@ag-ui/core';
import {
  BuiltInAgent,
  type BuiltInAgentCustomFactoryConfig,
} from '@copilotkit/runtime/v2';
import {
  HumanMessage,
  ToolMessage,
  isAIMessage,
  isHumanMessage,
  isToolMessage,
  type AIMessageChunk,
  type BaseMessage,
} from '@langchain/core/messages';

// Internal
import { compileWithDurableCheckpoints } from '@agent/agents/workspace-agent/graph.js';
import type { AgentUserContext } from '@agent/middleware/agent-user-auth.js';
import { withCheckpointUser } from '@agent/services/checkpoint-user-context.js';

/**
 * Per-run context handed to a BuiltInAgent custom factory (input, abort
 * signal, interrupt). The runtime does not export this type by name.
 */
type RunFactoryContext = Parameters<
  BuiltInAgentCustomFactoryConfig['factory']
>[0];

/**
 * createAgent node that runs the conversational model. Streaming text is
 * forwarded only from this node — other nodes also call chat models (the
 * summarization middleware writes its rolling summary with one) and that
 * output is engine bookkeeping, never something to render in the chat.
 */
const MODEL_NODE = 'model_request';
const TOOLS_NODE = 'tools';

/** The compiled graph is stateless per run; one instance serves all users. */
let cachedGraph: ReturnType<typeof compileWithDurableCheckpoints> | undefined;
const getGraph = (): ReturnType<typeof compileWithDurableCheckpoints> => {
  cachedGraph ??= compileWithDurableCheckpoints();
  return cachedGraph;
};

/** Extracts plain text from a string-or-content-blocks message payload. */
const textOf = (content: unknown): string => {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((block) =>
      block !== null &&
      typeof block === 'object' &&
      (block as { type?: unknown }).type === 'text' &&
      typeof (block as { text?: unknown }).text === 'string'
        ? (block as { text: string }).text
        : '',
    )
    .filter(Boolean)
    .join('\n');
};

/**
 * Converts the new turn from the AG-UI transcript into graph input.
 *
 * Only messages after the last assistant message are sent: everything older
 * already lives in the thread's checkpoint, and the frontend transcript may
 * additionally contain history the engine has deliberately compacted into a
 * summary — resending it would undo that compaction. Message ids are
 * preserved so the durable transcript can dedupe against live runs.
 */
export const newTurnMessages = (
  messages: readonly Message[],
): BaseMessage[] => {
  const lastAssistant = messages.reduce(
    (found, message, index) => (message.role === 'assistant' ? index : found),
    -1,
  );
  return messages.slice(lastAssistant + 1).flatMap((message): BaseMessage[] => {
    if (message.role === 'user') {
      const content = textOf(message.content);
      return content
        ? [new HumanMessage({ id: message.id, content })]
        : [];
    }
    if (message.role === 'tool') {
      return [
        new ToolMessage({
          id: message.id,
          content: message.content ?? '',
          tool_call_id: message.toolCallId,
        }),
      ];
    }
    return [];
  });
};

/**
 * Frontend tools and readable context for the in-graph CopilotKit middleware,
 * in the same normalized shape the remote LangGraph adapter used to build, so
 * `state.copilotkit.actions` keeps its contract.
 */
export const buildCopilotKitState = (
  input: RunAgentInput,
): {
  copilotkit: {
    actions: unknown[];
    context: Array<{ description: string; value: string }>;
    interceptedToolCalls: never[];
  };
} => ({
  copilotkit: {
    actions: (input.tools ?? []).map((tool) => ({
      type: 'function',
      name: tool.name,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    })),
    context: (input.context ?? []).map((entry) => ({
      description: entry.description,
      value: entry.value,
    })),
    interceptedToolCalls: [],
  },
});

/** Prefix langchain's summarizationMiddleware puts on its rolling summary. */
const SUMMARY_PREFIX = 'Here is a summary of the conversation to date:';

/**
 * Converts final engine state into the AG-UI transcript for the end-of-run
 * snapshot. The engine's rolling summary (a human message with a fixed
 * prefix) and system messages are model context, not conversation — they
 * never reach the screen.
 */
export const toTranscriptMessages = (
  messages: readonly BaseMessage[],
): Message[] =>
  messages.flatMap((message): Message[] => {
    if (!message.id) return [];
    if (isHumanMessage(message)) {
      const content = textOf(message.content);
      if (!content || content.startsWith(SUMMARY_PREFIX)) return [];
      return [{ id: message.id, role: 'user', content }];
    }
    if (isAIMessage(message)) {
      const toolCalls = (message.tool_calls ?? []).map((toolCall) => ({
        id: toolCall.id ?? '',
        type: 'function' as const,
        function: {
          name: toolCall.name,
          arguments: JSON.stringify(toolCall.args ?? {}),
        },
      }));
      const content = textOf(message.content);
      if (!content && toolCalls.length === 0) return [];
      return [
        {
          id: message.id,
          role: 'assistant',
          content,
          ...(toolCalls.length > 0 ? { toolCalls } : {}),
        },
      ];
    }
    if (isToolMessage(message)) {
      return [
        {
          id: message.id,
          role: 'tool',
          content: textOf(message.content),
          toolCallId: message.tool_call_id,
        },
      ];
    }
    return [];
  });

/** Shape of the `streamEvents({ version: 'v2' })` items the bridge consumes. */
type GraphStreamEvent = {
  readonly event: string;
  readonly metadata?: { readonly langgraph_node?: string };
  readonly data?: {
    readonly chunk?: AIMessageChunk;
    readonly input?: unknown;
    readonly output?: unknown;
  };
};

type ToolResultLike = {
  readonly tool_call_id?: string;
  readonly name?: string;
  readonly content?: unknown;
  readonly update?: { readonly messages?: ToolResultLike[] };
  readonly type?: string;
};

/** Unwraps a tool node output that may arrive as a Command state update. */
const toToolMessage = (output: unknown): ToolResultLike | undefined => {
  const candidate = output as ToolResultLike | undefined;
  if (!candidate || typeof candidate !== 'object') return undefined;
  if (candidate.tool_call_id) return candidate;
  return candidate.update?.messages?.find((message) => message.type === 'tool');
};

/**
 * Runs the workspace graph in-process and translates its event stream into
 * AG-UI events for the CopilotKit runtime.
 *
 * Chunk events are used deliberately: the AG-UI pipeline expands
 * TEXT_MESSAGE_CHUNK / TOOL_CALL_CHUNK into START/CONTENT/END spans and
 * closes any open span when the kind or id changes (and at stream end), so
 * the bridge never tracks span state itself. RUN_STARTED / RUN_FINISHED /
 * RUN_ERROR are emitted by the BuiltInAgent wrapper — never yielded here.
 *
 * A MESSAGES_SNAPSHOT built from final engine state closes every run.
 * Streaming chunks carry a provisional message id while the id persisted to
 * the durable transcript is the final engine-assigned one; the snapshot
 * replaces the provisional ids with the engine ids so the D1 hydration can
 * dedupe by id, and the frontend re-merges any older history the engine has
 * already compacted away.
 *
 * The verified user is installed into AsyncLocalStorage for the whole pull
 * of this generator so D1CheckpointSaver can still resolve the tenant when
 * LangGraph synthesizes configs that omit `x-agent-user-id`.
 */
export const streamWorkspaceRun = (
  context: RunFactoryContext,
  user: AgentUserContext,
): AsyncGenerator<BaseEvent> =>
  withCheckpointUser(user.userId, streamWorkspaceRunInner(context, user));

const streamWorkspaceRunInner = async function* (
  context: RunFactoryContext,
  user: AgentUserContext,
): AsyncGenerator<BaseEvent> {
  const { input } = context;
  const graph = getGraph();

  const configurable = {
    thread_id: input.threadId,
    // Same sanitized claim keys the trusted-context resolver reads; the
    // values come from the verified Firebase identity, never the client.
    'x-agent-request-id': user.requestId,
    'x-agent-user-id': user.userId,
    'x-agent-user-email': user.email,
    'x-agent-roles': encodeURIComponent(JSON.stringify(user.roles)),
  };

  const stream = graph.streamEvents(
    {
      messages: newTurnMessages(input.messages),
      ...buildCopilotKitState(input),
    },
    {
      version: 'v2',
      signal: context.abortSignal,
      configurable,
    },
  );

  // Fallback id for model chunks that arrive without one; reset per model
  // call so separate answers never merge into one bubble.
  let fallbackMessageId: string | undefined;
  // Tool calls already streamed from the model; results for anything else
  // (e.g. an intercepted call answered without streaming) need a synthetic
  // call announcement so the transcript has a call to attach the result to.
  const streamedToolCallIds = new Set<string>();

  for await (const event of stream as AsyncIterable<GraphStreamEvent>) {
    const node = event.metadata?.langgraph_node;

    if (event.event === 'on_chat_model_stream' && node === MODEL_NODE) {
      const chunk = event.data?.chunk;
      if (!chunk || chunk.response_metadata?.finish_reason) continue;

      const toolChunk = chunk.tool_call_chunks?.[0];
      if (toolChunk && (toolChunk.name || toolChunk.args)) {
        if (toolChunk.id) streamedToolCallIds.add(toolChunk.id);
        yield {
          type: EventType.TOOL_CALL_CHUNK,
          toolCallId: toolChunk.id ?? undefined,
          toolCallName: toolChunk.name ?? undefined,
          parentMessageId: chunk.id,
          delta: toolChunk.args ?? undefined,
        } as ToolCallChunkEvent;
        continue;
      }

      const text = textOf(chunk.content);
      if (!text) continue;
      fallbackMessageId = chunk.id ?? fallbackMessageId ?? randomUUID();
      yield {
        type: EventType.TEXT_MESSAGE_CHUNK,
        messageId: chunk.id ?? fallbackMessageId,
        role: 'assistant',
        delta: text,
      } as TextMessageChunkEvent;
      continue;
    }

    if (event.event === 'on_chat_model_end' && node === MODEL_NODE) {
      fallbackMessageId = undefined;
      continue;
    }

    if (event.event === 'on_tool_end' && node === TOOLS_NODE) {
      const toolMessage = toToolMessage(event.data?.output);
      if (!toolMessage?.tool_call_id) continue;
      if (!streamedToolCallIds.has(toolMessage.tool_call_id)) {
        streamedToolCallIds.add(toolMessage.tool_call_id);
        yield {
          type: EventType.TOOL_CALL_CHUNK,
          toolCallId: toolMessage.tool_call_id,
          toolCallName: toolMessage.name ?? '',
          parentMessageId: randomUUID(),
          delta: JSON.stringify(event.data?.input ?? {}),
        } as ToolCallChunkEvent;
      }
      yield {
        type: EventType.TOOL_CALL_RESULT,
        toolCallId: toolMessage.tool_call_id,
        content: textOf(toolMessage.content) || JSON.stringify(toolMessage.content),
        messageId: randomUUID(),
        role: 'tool',
      } as ToolCallResultEvent;
    }
  }

  const state = await graph.getState({ configurable });
  const finalMessages = (state.values as { messages?: BaseMessage[] }).messages;
  yield {
    type: EventType.MESSAGES_SNAPSHOT,
    messages: toTranscriptMessages(finalMessages ?? []),
  } as MessagesSnapshotEvent;
};

/**
 * In-process AG-UI agent for one verified user. Built per request by the
 * runtime's agents factory so the identity in scope is always the one the
 * Firebase middleware verified for this call.
 */
export const createWorkspaceBridgeAgent = (
  user: AgentUserContext,
): BuiltInAgent =>
  new BuiltInAgent({
    type: 'custom',
    factory: (context) => streamWorkspaceRun(context, user),
  });
