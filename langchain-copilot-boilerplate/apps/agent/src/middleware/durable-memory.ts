// Libs for third party
import {
  type BaseMessage,
  isAIMessage,
  isHumanMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { createMiddleware } from 'langchain';

// Internal
import {
  DurableMemoryStateSchema,
  type TrustedAgentStateContext,
} from '@agent/middleware/durable-memory-state.js';
import {
  appendMemoryTurn,
  deleteMemoryThread,
  deleteMemoryUser,
  listMemoryThread,
  retrieveMemory,
} from '@agent/services/memory-client.js';
import { memoryManagementTool } from '@agent/tools/memory-management.tool.js';

type AgentState = {
  readonly agentContext?: TrustedAgentStateContext;
  readonly messages: readonly BaseMessage[];
  readonly retrievedMemory?: readonly string[];
  readonly memoryWriteIds?: readonly string[];
};

/**
 * Rebuilds the verified identity from the middleware runtime.
 *
 * The CopilotKit runtime forwards the sanitized `x-agent-*` headers on its
 * requests to the LangGraph server; the LangGraph server copies every `x-*`
 * request header into the run's configurable under its lowercased name (see
 * `applyRequestHeadersToRunConfig` in @langchain/langgraph-api), and
 * middleware hooks receive that map as `runtime.configurable`.
 */
export const resolveTrustedContext = (
  runtime: unknown,
): AgentState['agentContext'] => {
  const configurable = (
    runtime as { configurable?: Record<string, unknown> }
  ).configurable;
  const header = (name: string): string | undefined => {
    const value = configurable?.[name];
    return typeof value === 'string' && value ? value : undefined;
  };

  const threadId = configurable?.thread_id;
  const requestId = header('x-agent-request-id');
  const userId = header('x-agent-user-id');
  const email = header('x-agent-user-email');
  const rolesHeader = header('x-agent-roles');
  if (
    typeof threadId !== 'string' ||
    !requestId ||
    !userId ||
    !email ||
    !rolesHeader
  ) {
    return undefined;
  }

  try {
    const roles: unknown = JSON.parse(decodeURIComponent(rolesHeader));
    if (!Array.isArray(roles) || !roles.every((role) => typeof role === 'string')) {
      return undefined;
    }
    return { requestId, userId, email, roles, threadId };
  } catch {
    return undefined;
  }
};

/**
 * Durable memory is an enhancement layer: when the memory service is
 * unreachable the chat turn must still complete, so reads fall back to
 * empty context and writes are dropped with a warning (never the content).
 */
const swallowMemoryError = async <T>(
  operation: string,
  task: Promise<T>,
  fallback: T,
): Promise<T> => {
  try {
    return await task;
  } catch (error) {
    console.warn(
      `[durable-memory] ${operation} failed:`,
      error instanceof Error ? error.message : 'unknown error',
    );
    return fallback;
  }
};

/** Message content is either a plain string or an array of content blocks. */
const textOf = (content: unknown): string | undefined => {
  if (typeof content === 'string') return content || undefined;
  if (Array.isArray(content)) {
    const text = content
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
    return text || undefined;
  }
  return undefined;
};

export const latestTurn = (
  messages: readonly BaseMessage[],
  predicate: (message: BaseMessage) => boolean,
): { messageId?: string; content: string } | undefined => {
  const message = [...messages].reverse().find(predicate);
  const content = message ? textOf(message.content) : undefined;
  if (!message || !content) return undefined;
  return { messageId: message.id, content };
};

/**
 * Loads durable context and persists the user turn before model execution.
 * This makes the starting message durable even when the model or a tool fails.
 */
export const durableMemoryMiddleware = createMiddleware({
  name: 'DurableMemoryMiddleware',
  stateSchema: DurableMemoryStateSchema,
  tools: [memoryManagementTool],
  wrapToolCall: async (request, handler) => {
    if (request.toolCall.name !== 'manage_memory') return handler(request);
    const identity = (request.state as AgentState).agentContext;
    if (!identity) {
      throw new Error('Trusted agent context is unavailable');
    }
    const action = request.toolCall.args.action;
    let content: string;
    try {
      if (action === 'list_thread') {
        const turns = await listMemoryThread(identity);
        content = JSON.stringify(turns);
      } else if (action === 'delete_thread') {
        await deleteMemoryThread(identity);
        content = 'The current conversation memory has been deleted.';
      } else if (action === 'delete_all') {
        await deleteMemoryUser(identity);
        content = 'All durable conversation memory has been deleted.';
      } else {
        content = 'Unsupported memory action.';
      }
    } catch (error) {
      console.warn(
        '[durable-memory] manage_memory failed:',
        error instanceof Error ? error.message : 'unknown error',
      );
      content = 'The memory service is currently unavailable. Please try again later.';
    }
    return new ToolMessage({
      content,
      tool_call_id: request.toolCall.id ?? request.toolCall.name,
      name: request.toolCall.name,
    });
  },
  beforeAgent: async (state: AgentState, runtime) => {
    const agentContext = state.agentContext ?? resolveTrustedContext(runtime);
    if (!agentContext) return;
    const userTurn = latestTurn(state.messages, isHumanMessage);
    if (!userTurn) return { agentContext };
    const retrievedMemory = await swallowMemoryError(
      'memory retrieval',
      retrieveMemory(agentContext, userTurn.content),
      [],
    );
    const userWriteId = await swallowMemoryError(
      'user turn write',
      appendMemoryTurn({
        ...agentContext,
        role: 'user',
        ...userTurn,
      }),
      undefined,
    );
    return {
      agentContext,
      retrievedMemory,
      memoryWriteIds: userWriteId ? [userWriteId] : [],
    };
  },
  wrapModelCall: async (request, handler) => {
    const memory = (request.state as AgentState).retrievedMemory ?? [];
    if (memory.length === 0) return handler(request);
    const memoryPrompt = `Relevant durable conversation context:\n${memory
      .map((entry) => `- ${entry}`)
      .join('\n')}`;
    return handler({
      ...request,
      systemPrompt: [request.systemPrompt, memoryPrompt]
        .filter(Boolean)
        .join('\n\n'),
    });
  },
  afterAgent: async (state: AgentState) => {
    if (!state.agentContext) return;
    const assistantTurn = latestTurn(state.messages, isAIMessage);
    if (!assistantTurn) return;
    const assistantWriteId = await swallowMemoryError(
      'assistant turn write',
      appendMemoryTurn({
        ...state.agentContext,
        role: 'assistant',
        ...assistantTurn,
      }),
      undefined,
    );
    return {
      memoryWriteIds: assistantWriteId
        ? [...(state.memoryWriteIds ?? []), assistantWriteId]
        : [...(state.memoryWriteIds ?? [])],
    };
  },
});
