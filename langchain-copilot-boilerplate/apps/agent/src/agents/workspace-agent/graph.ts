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
        trigger: { messages: 16 },
        keep: { messages: 8 },
      }),
      // Bridges the graph to CopilotKit for streamed tokens and client tools.
      copilotkitMiddleware,
    ],
  });
};

/** Compiled workspace graph type shared by every compile variant. */
export type WorkspaceGraph = ReturnType<typeof buildWorkspaceAgent>['graph'];

/**
 * Compiles the agent with the durable D1 checkpointer — the short-term
 * memory for the in-process CopilotKit runs. Conversations survive process
 * restarts because engine state lives in D1, next to the transcript ledger.
 * Without a configured memory worker the graph degrades to in-memory
 * checkpoints (threads reset on restart) instead of failing every run.
 * Compilation is deferred to first use so importing this module never
 * requires model credentials (tests exercise the pure helpers around it).
 */
export const compileWithDurableCheckpoints = (): WorkspaceGraph => {
  const agent = buildWorkspaceAgent();
  if (env.MEMORY_WORKER_URL) {
    agent.checkpointer = new D1CheckpointSaver();
  } else {
    console.warn(
      '[workspace-agent] MEMORY_WORKER_URL is not set; using in-memory checkpoints (threads will not survive restarts)',
    );
    agent.checkpointer = new MemorySaver();
  }
  return agent.graph;
};
