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
  DefaultAgentStateSchema,
  type TrustedAgentStateContext,
} from '@agent/agents/default-agent/state.js';
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

export const resolveTrustedContext = (
  runtime: unknown,
): AgentState['agentContext'] => {
  const configurable = (
    runtime as {
      config?: { configurable?: Record<string, unknown> };
    }
  ).config?.configurable;
  const headers = configurable?.copilotkit_forwarded_headers as
    | Record<string, string>
    | undefined;
  const threadId = configurable?.thread_id;
  if (
    !headers ||
    typeof threadId !== 'string' ||
    !headers['x-agent-request-id'] ||
    !headers['x-agent-user-id'] ||
    !headers['x-agent-tenant-id'] ||
    !headers['x-agent-roles']
  ) {
    return undefined;
  }
  try {
    const roles: unknown = JSON.parse(decodeURIComponent(headers['x-agent-roles']));
    if (!Array.isArray(roles) || !roles.every((role) => typeof role === 'string')) {
      return undefined;
    }
    return {
      requestId: headers['x-agent-request-id'],
      userId: headers['x-agent-user-id'],
      tenantId: headers['x-agent-tenant-id'],
      roles,
      threadId,
    };
  } catch {
    return undefined;
  }
};

const latestContent = (
  messages: readonly BaseMessage[],
  predicate: (message: BaseMessage) => boolean,
): string | undefined => {
  const message = [...messages].reverse().find(predicate);
  return message && typeof message.content === 'string' ? message.content : undefined;
};

/**
 * Loads durable context and persists the user turn before model execution.
 * This makes the starting message durable even when the model or a tool fails.
 */
export const durableMemoryMiddleware = createMiddleware({
  name: 'DurableMemoryMiddleware',
  stateSchema: DefaultAgentStateSchema,
  tools: [memoryManagementTool],
  wrapToolCall: async (request, handler) => {
    if (request.toolCall.name !== 'manage_memory') return handler(request);
    const identity = (request.state as AgentState).agentContext;
    if (!identity) {
      throw new Error('Trusted agent context is unavailable');
    }
    const action = request.toolCall.args.action;
    let content: string;
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
    return new ToolMessage({
      content,
      tool_call_id: request.toolCall.id ?? request.toolCall.name,
      name: request.toolCall.name,
    });
  },
  beforeAgent: async (state: AgentState, runtime) => {
    const agentContext = state.agentContext ?? resolveTrustedContext(runtime);
    if (!agentContext) return;
    const query = latestContent(state.messages, isHumanMessage);
    if (!query) return { agentContext };
    const retrievedMemory = await retrieveMemory(agentContext, query);
    const userWriteId = await appendMemoryTurn({
      ...agentContext,
      role: 'user',
      content: query,
    });
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
    const assistantContent = latestContent(state.messages, isAIMessage);
    if (!assistantContent) return;
    const assistantWriteId = await appendMemoryTurn({
      ...state.agentContext,
      role: 'assistant',
      content: assistantContent,
    });
    return {
      memoryWriteIds: assistantWriteId
        ? [...(state.memoryWriteIds ?? []), assistantWriteId]
        : [...(state.memoryWriteIds ?? [])],
    };
  },
});
