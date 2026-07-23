// Libs for third party
import { createCopilotkitMiddleware } from '@copilotkit/sdk-js/langgraph';
import { MemorySaver } from '@langchain/langgraph';
import { createAgent, summarizationMiddleware } from 'langchain';

// Internal
import {
  D1CheckpointSaver,
  DurableMemoryStateSchema,
  durableMemoryMiddleware,
  getChatModel,
} from '@repo/agent-runtime';
import { KITCHEN_AGENT_SYSTEM_PROMPT } from '@agent/agents/kitchen-agent/prompt.js';
import { env } from '@agent/config/env.js';
import { tools } from '@agent/tools/index.js';

const copilotkitMiddleware = createCopilotkitMiddleware({
  exposeState: false,
});

/**
 * Engine short-term memory: D1 via the memory worker when configured,
 * otherwise an in-process MemorySaver (threads reset on restart). Also used
 * by the embedded LangGraph platform app, which injects its own instance at
 * graph load time.
 */
export const createCheckpointer = () =>
  env.MEMORY_WORKER_URL ? new D1CheckpointSaver() : new MemorySaver();

/** Builds a ReAct-style conversational agent with CopilotKit streaming support. */
const buildKitchenAgent = () => {
  const model = getChatModel('kitchen-agent-v1');

  return createAgent({
    model,
    tools,
    stateSchema: DurableMemoryStateSchema,
    systemPrompt: KITCHEN_AGENT_SYSTEM_PROMPT,
    checkpointer: createCheckpointer(),
    // Keep durable threads from sending an ever-growing prompt. Summarization
    // only runs after eight turns, then preserves the most recent four turns.
    middleware: [
      // Authenticated context → durable-memory retrieval → ReAct loop →
      // transcript persistence.
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

const kitchenAgent = buildKitchenAgent();

/**
 * Compiled graph with durable (or in-process) checkpointer. Served through
 * the embedded LangGraph platform app via `graphs/registry.ts`.
 */
export const graph = kitchenAgent.graph;
