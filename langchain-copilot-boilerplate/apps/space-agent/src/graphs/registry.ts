// Libs for third party
import type { Hono } from 'hono';
import type { CopilotRuntime } from '@copilotkit/runtime/v2';

// Internal
import {
  D1ThreadSaver,
  createCopilotRuntime,
  createInMemoryThreadSaver,
  createLangGraphEmbedApp,
  type AgentDefinition,
  type EmbedGraphs,
} from '@repo/agent-runtime';
import { resumeGraph } from '@agent/agents/resume-agent/graph.js';
import { createCheckpointer, graph } from '@agent/agents/workspace-agent/graph.js';
import { env } from '@agent/config/env.js';
import { RESUME_AGENT_ID, WORKSPACE_AGENT_ID } from '@agent/graphs/agent-ids.js';

export type { AgentDefinition };
export { RESUME_AGENT_ID, WORKSPACE_AGENT_ID };

/**
 * Registry of agents served by this backend — the single place product
 * graphs are wired into the runtime and the embedded LangGraph app.
 *
 * To add an agent:
 *   1. Create `src/agents/<name>/graph.ts` exporting `graph`.
 *   2. Add an entry here — the CopilotKit runtime and the embed app pick it
 *      up automatically.
 *   3. Optionally register it in `langgraph.json` for LangGraph Studio.
 */
export const AGENT_REGISTRY: readonly AgentDefinition[] = [
  {
    id: WORKSPACE_AGENT_ID,
    graphId: WORKSPACE_AGENT_ID,
    description:
      'Workspace assistant: employee/project/time-off lookups over the product API, with bounded conversation memory.',
    graph,
  },
  {
    id: RESUME_AGENT_ID,
    graphId: RESUME_AGENT_ID,
    description:
      "Resume reviewer: loads the signed-in user's resume from the product API and routes through conditional branches to an improvement plan or a strengths summary.",
    graph: resumeGraph,
  },
];

/**
 * Embedded LangGraph platform app over the registry graphs, with D1
 * persistence when MEMORY_WORKER_URL is set (in-process fallbacks
 * otherwise — state resets on restart).
 *
 * @param extraGraphs Additional graphs to serve (regression harness only).
 */
export const createWorkspaceEmbedApp = (extraGraphs: EmbedGraphs = {}): Hono =>
  createLangGraphEmbedApp({
    graphs: {
      ...Object.fromEntries(
        AGENT_REGISTRY.map((agent) => [agent.graphId, agent.graph]),
      ),
      ...extraGraphs,
    },
    checkpointer: createCheckpointer(),
    threads: env.MEMORY_WORKER_URL
      ? new D1ThreadSaver()
      : createInMemoryThreadSaver(),
  });

/** CopilotKit runtime over the registry agents. */
export const createWorkspaceCopilotRuntime = (): CopilotRuntime =>
  createCopilotRuntime(AGENT_REGISTRY);
