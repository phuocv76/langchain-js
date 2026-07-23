/**
 * Regression harness: serves the workspace graph through LangGraph's experimental embed
 * server (`@langchain/langgraph-api/experimental/embed`) with checkpoints in
 * D1 — the same runtime the BFF embeds in production. Run with:
 *
 *   cd apps/space-agent && npx tsx --env-file=.env src/regression/embed-server-harness.ts
 *
 * Requires the memory worker on MEMORY_WORKER_URL (pnpm --filter
 * @repo/memory-worker dev:space) so D1CheckpointSaver has a backend.
 */

// Libs for third party
import { serve } from '@hono/node-server';
import { createEmbedServer } from '@langchain/langgraph-api/experimental/embed';
import { Hono } from 'hono';

// Internal
import {
  D1CheckpointSaver,
  createInMemoryThreadSaver,
  runWithCheckpointUser,
} from '@repo/agent-runtime';
import { graph } from '@agent/agents/workspace-agent/graph.js';
import { WORKSPACE_AGENT_ID } from '@agent/graphs/agent-ids.js';

/** Fixed tenant for regression runs; production would verify Firebase per request. */
export const REGRESSION_USER_ID = 'regression-user';
export const REGRESSION_GRAPH_ID = WORKSPACE_AGENT_ID;
const PORT = 2100;

/**
 * Builds the embed app: LangGraph platform routes over the workspace graph
 * with D1 checkpoints. The embed routes run the graph and call
 * `graph.getState` with configs LangGraph synthesizes itself (thread_id
 * only), so the tenant for D1 scoping must come from AsyncLocalStorage —
 * the same mechanism the production embed app uses.
 */
type EmbedGraphs = Parameters<typeof createEmbedServer>[0]['graph'];

export const buildEmbedApp = (extraGraphs: EmbedGraphs = {}): Hono => {
  const embed = createEmbedServer({
    graph: { [REGRESSION_GRAPH_ID]: graph, ...extraGraphs },
    checkpointer: new D1CheckpointSaver(),
    threads: createInMemoryThreadSaver(),
  });

  const app = new Hono();
  app.use('*', (_c, next) => runWithCheckpointUser(REGRESSION_USER_ID, next));
  app.route('/', embed);
  return app;
};

if (process.argv[1]?.endsWith('embed-server-harness.ts')) {
  serve({ fetch: buildEmbedApp().fetch, port: PORT }, (info) => {
    console.log(`[regression] embed server listening on http://localhost:${info.port}`);
  });
}
