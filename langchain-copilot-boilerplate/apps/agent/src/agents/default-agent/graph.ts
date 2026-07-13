// Libs for third party
import { createCopilotkitMiddleware } from '@copilotkit/sdk-js/langgraph';
import { MemorySaver } from '@langchain/langgraph';
import { createAgent, summarizationMiddleware } from 'langchain';

// Internal
import { DefaultAgentStateSchema } from '@agent/agents/default-agent/state.js';
import { getChatModel } from '@agent/models/index.js';
import { durableMemoryMiddleware } from '@agent/middleware/durable-memory.js';
import { DEFAULT_AGENT_SYSTEM_PROMPT } from '@agent/prompts/default-agent.prompt.js';
import { tools } from '@agent/tools/index.js';

const copilotkitMiddleware = createCopilotkitMiddleware({
  exposeState: false,
});

/** Builds a ReAct-style conversational agent with CopilotKit streaming support. */
const buildDefaultAgent = () => {
  const model = getChatModel();

  return createAgent({
    model,
    tools,
    stateSchema: DefaultAgentStateSchema,
    systemPrompt: DEFAULT_AGENT_SYSTEM_PROMPT,
    // Keep durable threads from sending an ever-growing prompt. Summarization
    // only runs after eight turns, then preserves the most recent four turns.
    middleware: [
      // Explicit flow: authenticated context → durable-memory retrieval →
      // ReAct model/tool loop → transcript persistence.
      durableMemoryMiddleware,
      summarizationMiddleware({
        model,
        trigger: { messages: 16 },
        keep: { messages: 8 },
      }),
      // Bridges the graph to CopilotKit for streamed tokens and client tools.
      copilotkitMiddleware,
    ],
  });
};

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
