/**
 * Regression harness: CopilotKit runtime → @ag-ui/langgraph LangGraphAgent → the
 * PRODUCTION embed app (`createLangGraphEmbedApp`) → D1 checkpoints. Run with:
 *
 *   cd apps/agent && npx tsx --env-file=.env src/regression/copilotkit-gateway-harness.ts
 *
 * Port 2100: production embed app (assistants shim + embed server + verified
 * claim injection). Port 2200: CopilotKit Hono handler, multi-route
 * (`/copilotkit/agent/:id/run`).
 *
 * Identity travels exactly like production: the adapter's `headerFactory`
 * sends the sanitized `x-agent-*` headers (in the BFF, `requireAgentUser`
 * sets these after verifying the Firebase token) and the embed app rewrites
 * every run-creation body to carry those verified claims in
 * `config.configurable` — the adapter itself filters custom configurable
 * keys out of its payload, so claims must never rely on `assistantConfig`.
 */

// Libs for third party
import { LangGraphAgent } from '@ag-ui/langgraph';
import { serve } from '@hono/node-server';
import {
  CopilotRuntime,
  createCopilotHonoHandler,
} from '@copilotkit/runtime/v2';
import { Hono } from 'hono';

// Internal
import { LANGGRAPH_BASE_PATH } from '@agent/config/intelligence.js';
import { createLangGraphEmbedApp } from '@agent/services/langgraph-embed-app.js';
import { approvalGraph } from './approval-graph.js';
import { REGRESSION_GRAPH_ID, REGRESSION_USER_ID } from './embed-server-harness.js';

/** Second regression graph: HITL interrupt/resume through embed + D1. */
export const APPROVAL_GRAPH_ID = 'approvalCheck';

const EMBED_PORT = 2100;
const COPILOTKIT_PORT = 2200;

/** Same sanitized claim headers `requireAgentUser` injects from verified auth. */
const regressionClaimHeaders = {
  'x-agent-request-id': 'regression-request',
  'x-agent-user-id': REGRESSION_USER_ID,
  'x-agent-user-email': 'regression@example.com',
  'x-agent-roles': encodeURIComponent(JSON.stringify(['user'])),
  'x-agent-access-token': 'regression-token',
};

// Mounted under the same base path the BFF uses so prefix handling in the
// embed app's dispatch is exercised, not just the root-mounted shape.
const gateway = new Hono();
gateway.route(
  LANGGRAPH_BASE_PATH,
  createLangGraphEmbedApp({ [APPROVAL_GRAPH_ID]: approvalGraph }),
);

serve({ fetch: gateway.fetch, port: EMBED_PORT }, (info) => {
  console.log(
    `[regression] embed gateway on http://localhost:${info.port}${LANGGRAPH_BASE_PATH}`,
  );
});

const agentFor = (graphId: string): LangGraphAgent =>
  new LangGraphAgent({
    deploymentUrl: `http://localhost:${EMBED_PORT}${LANGGRAPH_BASE_PATH}`,
    graphId,
    headerFactory: () => regressionClaimHeaders,
  });

const runtime = new CopilotRuntime({
  agents: {
    [REGRESSION_GRAPH_ID]: agentFor(REGRESSION_GRAPH_ID),
    [APPROVAL_GRAPH_ID]: agentFor(APPROVAL_GRAPH_ID),
  },
});

const copilotApp = createCopilotHonoHandler({
  runtime,
  basePath: '/copilotkit',
  mode: 'multi-route',
});

serve({ fetch: copilotApp.fetch, port: COPILOTKIT_PORT }, (info) => {
  console.log(`[regression] copilotkit runtime on http://localhost:${info.port}`);
});
