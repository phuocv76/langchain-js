// Libs for third party
import { createCopilotkitMiddleware } from '@copilotkit/sdk-js/langgraph';
import { MemorySaver } from '@langchain/langgraph';
import { createAgent, summarizationMiddleware } from 'langchain';

// Internal
import { WORKSPACE_AGENT_SYSTEM_PROMPT } from '@agent/agents/workspace-agent/prompt.js';
import { env } from '@agent/config/env.js';
import { getChatModel } from '@agent/models/index.js';
import { durableMemoryMiddleware } from '@agent/middleware/durable-memory.js';
import { DurableMemoryStateSchema } from '@agent/middleware/durable-memory-state.js';
import { workspaceToolsMiddleware } from '@agent/middleware/workspace-tools.js';
import { D1CheckpointSaver } from '@agent/services/d1-checkpoint-saver.js';
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
const buildWorkspaceAgent = () => {
  const model = getChatModel();

  return createAgent({
    model,
    tools,
    stateSchema: DurableMemoryStateSchema,
    systemPrompt: WORKSPACE_AGENT_SYSTEM_PROMPT,
    checkpointer: createCheckpointer(),
    // Keep durable threads from sending an ever-growing prompt. Summarization
    // only runs after eight turns, then preserves the most recent four turns.
    middleware: [
      // Explicit flow: authenticated context → durable-memory retrieval →
      // ReAct model/tool loop → transcript persistence.
      durableMemoryMiddleware,
      // Read-only product-API tools acting as the verified user.
      workspaceToolsMiddleware,
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

const workspaceAgent = buildWorkspaceAgent();

/**
 * Compiled graph with durable (or in-process) checkpointer. Served through
 * the embedded LangGraph platform app (`services/langgraph-embed-app.ts`),
 * which re-injects the same checkpointer kind at load time.
 */
export const graph = workspaceAgent.graph;

/** Compiled workspace graph type shared by tests and tooling. */
export type WorkspaceGraph = typeof graph;
