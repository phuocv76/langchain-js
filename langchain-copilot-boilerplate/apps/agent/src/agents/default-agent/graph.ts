// Libs for third party
import { createCopilotkitMiddleware } from '@copilotkit/sdk-js/langgraph';
import { MemorySaver } from '@langchain/langgraph';
import { createAgent, createMiddleware } from 'langchain';

// Internal
import { DefaultAgentStateSchema } from '@agent/agents/default-agent/state.js';
import { getChatModel } from '@agent/models/index.js';
import { DEFAULT_AGENT_SYSTEM_PROMPT } from '@agent/prompts/default-agent.prompt.js';
import { tools } from '@agent/tools/index.js';

const copilotkitMiddleware = createCopilotkitMiddleware({
  exposeState: false,
});

const getUserNameFromCopilotContext = (
  state: Record<string, unknown>,
): string | undefined => {
  const context = (
    state.copilotkit as
      { context?: Array<{ description?: string; value?: string }> } | undefined
  )?.context;

  const userContext = context?.find(
    (item) => item.description === 'Signed-in application user profile',
  );

  if (!userContext?.value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(userContext.value) as { userName?: unknown };
    return typeof parsed.userName === 'string'
      ? parsed.userName.trim()
      : undefined;
  } catch {
    return undefined;
  }
};

const greetingStateMiddleware = createMiddleware({
  name: 'GreetingStateMiddleware',
  stateSchema: DefaultAgentStateSchema,
  wrapToolCall: async (request, handler) => {
    if (request.toolCall.name !== 'greeting') {
      return handler(request);
    }

    const args =
      typeof request.toolCall.args === 'object' &&
      request.toolCall.args !== null
        ? request.toolCall.args
        : {};
    const requestedName =
      'name' in args && typeof args.name === 'string' ? args.name.trim() : '';
    const stateName = getUserNameFromCopilotContext(request.state);

    if (requestedName || !stateName) {
      return handler(request);
    }

    return handler({
      ...request,
      toolCall: {
        ...request.toolCall,
        args: {
          ...args,
          name: stateName,
        },
      },
    });
  },
});

/** Builds a ReAct-style conversational agent with CopilotKit streaming support. */
const buildDefaultAgent = () =>
  createAgent({
    model: getChatModel(),
    tools,
    stateSchema: DefaultAgentStateSchema,
    systemPrompt: DEFAULT_AGENT_SYSTEM_PROMPT,
    // `copilotkitMiddleware` bridges the graph to the CopilotKit runtime so the
    // frontend receives streamed tokens and tool-call events.
    middleware: [greetingStateMiddleware, copilotkitMiddleware],
  });

const defaultAgent = buildDefaultAgent();

/**
 * Compiled graph consumed by the LangGraph dev server.
 * The server provides its own checkpointer/persistence.
 */
export const graph = defaultAgent.graph;

/**
 * Compiles the same agent with in-memory checkpointing.
 * Used by the standalone `POST /chat` REST endpoint (in-process, no dev server).
 */
export const compileWithMemory = (): typeof graph => {
  const agent = buildDefaultAgent();
  agent.checkpointer = new MemorySaver();
  return agent.graph;
};
