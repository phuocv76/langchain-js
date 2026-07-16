// Libs for third party
import { createCopilotkitMiddleware } from '@copilotkit/sdk-js/langgraph';
import { MemorySaver } from '@langchain/langgraph';
import { createAgent, summarizationMiddleware } from 'langchain';

// Internal
import { WORKSPACE_AGENT_SYSTEM_PROMPT } from '@agent/agents/workspace-agent/prompt.js';
import { getChatModel } from '@agent/models/index.js';
import { durableMemoryMiddleware } from '@agent/middleware/durable-memory.js';
import { DurableMemoryStateSchema } from '@agent/middleware/durable-memory-state.js';
import { workspaceToolsMiddleware } from '@agent/middleware/workspace-tools.js';
import { tools } from '@agent/tools/index.js';

const copilotkitMiddleware = createCopilotkitMiddleware({
  exposeState: false,
});

/** Builds a ReAct-style conversational agent with CopilotKit streaming support. */
const buildWorkspaceAgent = () => {
  const model = getChatModel();

  return createAgent({
    model,
    tools,
    stateSchema: DurableMemoryStateSchema,
    systemPrompt: WORKSPACE_AGENT_SYSTEM_PROMPT,
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
        trigger: { messages: 4 },
        keep: { messages: 1 },
      }),
      // Bridges the graph to CopilotKit for streamed tokens and client tools.
      copilotkitMiddleware,
    ],
  });
};

const workspaceAgent = buildWorkspaceAgent();

/**
 * Compiled graph consumed by the LangGraph dev server.
 * The server provides its own checkpointer/persistence.
 */
export const graph = workspaceAgent.graph;

/**
 * Compiles the same agent with in-memory checkpointing.
 * Used by the standalone `POST /chat` REST endpoint (in-process, no dev server).
 */
export const compileWithMemory = (): typeof graph => {
  const agent = buildWorkspaceAgent();
  agent.checkpointer = new MemorySaver();
  return agent.graph;
};
