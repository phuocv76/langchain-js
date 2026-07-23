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
  AGENT_HEADER_REQUEST_ID,
  AGENT_HEADER_ROLES,
  AGENT_HEADER_USER_EMAIL,
  AGENT_HEADER_USER_ID,
} from '@repo/shared';
import {
  DurableMemoryStateSchema,
  type TrustedAgentStateContext,
} from './durable-memory-state.js';
import {
  appendMemoryTurn,
  deleteMemoryThread,
  deleteMemoryUser,
  listMemoryThread,
  retrieveMemory,
} from '../services/memory-client.js';
import { nowIso, publishRealtimeEvent } from '../services/realtime/index.js';
import {
  MEMORY_MANAGEMENT_TOOL_NAME,
  memoryManagementTool,
} from '../tools/memory-management.tool.js';

type AgentState = {
  readonly agentContext?: TrustedAgentStateContext;
  readonly messages: readonly BaseMessage[];
  readonly retrievedMemory?: readonly string[];
  readonly memoryWriteIds?: readonly string[];
};

/**
 * Rebuilds the verified identity from the middleware runtime.
 *
 * The embed app rewrites every run-creation body so `config.configurable`
 * carries the sanitized claims from the verified headers (see
 * `withVerifiedRunClaims` in services/langgraph-embed-app.ts); middleware
 * hooks receive that map as `runtime.configurable`.
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
  const requestId = header(AGENT_HEADER_REQUEST_ID);
  const userId = header(AGENT_HEADER_USER_ID);
  const email = header(AGENT_HEADER_USER_EMAIL);
  const rolesHeader = header(AGENT_HEADER_ROLES);
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
    if (request.toolCall.name !== MEMORY_MANAGEMENT_TOOL_NAME) return handler(request);
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
        await publishRealtimeEvent({
          userId: identity.userId,
          event: {
            type: 'THREAD_DELETED',
            threadId: identity.threadId,
            updatedAt: nowIso(),
          },
        });
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
    const userWrite = await swallowMemoryError(
      'user turn write',
      appendMemoryTurn({
        ...agentContext,
        role: 'user',
        ...userTurn,
      }),
      undefined,
    );
    if (userWrite) {
      const updatedAt = nowIso();
      await publishRealtimeEvent({
        userId: agentContext.userId,
        event: {
          type: 'MESSAGE_CREATED',
          threadId: agentContext.threadId,
          messageId: userTurn.messageId ?? userWrite.id,
          role: 'user',
          updatedAt,
        },
      });
      await publishRealtimeEvent({
        userId: agentContext.userId,
        event: {
          type: userWrite.isNewThread ? 'THREAD_CREATED' : 'THREAD_UPDATED',
          threadId: agentContext.threadId,
          title: userWrite.isNewThread ? userTurn.content.slice(0, 80) : undefined,
          updatedAt,
        },
      });
    }
    return {
      agentContext,
      retrievedMemory,
      memoryWriteIds: userWrite ? [userWrite.id] : [],
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
    const assistantWrite = await swallowMemoryError(
      'assistant turn write',
      appendMemoryTurn({
        ...state.agentContext,
        role: 'assistant',
        ...assistantTurn,
      }),
      undefined,
    );
    if (assistantWrite) {
      const updatedAt = nowIso();
      await publishRealtimeEvent({
        userId: state.agentContext.userId,
        event: {
          type: 'MESSAGE_CREATED',
          threadId: state.agentContext.threadId,
          messageId: assistantTurn.messageId ?? assistantWrite.id,
          role: 'assistant',
          updatedAt,
        },
      });
      await publishRealtimeEvent({
        userId: state.agentContext.userId,
        event: {
          type: assistantWrite.isNewThread ? 'THREAD_CREATED' : 'THREAD_UPDATED',
          threadId: state.agentContext.threadId,
          updatedAt,
        },
      });
    }
    return {
      memoryWriteIds: assistantWrite
        ? [...(state.memoryWriteIds ?? []), assistantWrite.id]
        : [...(state.memoryWriteIds ?? [])],
    };
  },
});
