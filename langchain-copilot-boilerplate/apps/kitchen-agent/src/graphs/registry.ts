// Libs for third party
import type { Hono } from 'hono';

// Internal
import {
  D1ThreadSaver,
  createCopilotRuntime,
  createInMemoryThreadSaver,
  createLangGraphEmbedApp,
  type AgentDefinition,
  type CopilotRuntime,
  type EmbedGraphs,
} from '@repo/agent-runtime';
import { createCheckpointer, graph } from '@agent/agents/kitchen-agent/graph.js';
import { env } from '@agent/config/env.js';
import { KITCHEN_AGENT_ID } from '@agent/graphs/agent-ids.js';

export type { AgentDefinition };
export { KITCHEN_AGENT_ID };

/**
 * Registry of agents served by this backend — the single place product
 * graphs are wired into the runtime and the embedded LangGraph app.
 *
 * To add an agent:
 *   1. Create `src/agents/<name>/graph.ts` exporting `graph`.
 *   2. Add an entry here — the CopilotKit runtime and the embed app pick it
 *      up automatically.
 */
export const AGENT_REGISTRY: readonly AgentDefinition[] = [
  {
    id: KITCHEN_AGENT_ID,
    graphId: KITCHEN_AGENT_ID,
    description:
      'Kitchen assistant (skeleton): conversational agent with durable memory; add kitchen tools over the product API.',
    graph,
  },
];

/**
 * Embedded LangGraph platform app over the registry graphs, with D1
 * persistence when MEMORY_WORKER_URL is set (in-process fallbacks
 * otherwise — state resets on restart).
 *
 * @param extraGraphs Additional graphs to serve (regression harness only).
 */
export const createKitchenEmbedApp = (extraGraphs: EmbedGraphs = {}): Hono =>
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
export const createKitchenCopilotRuntime = (): CopilotRuntime =>
  createCopilotRuntime(AGENT_REGISTRY);
