// Libs for third party
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';

// Internal
import {
  LANGGRAPH_BASE_PATH,
  corsOrigins,
  createLangGraphEmbedApp,
  env,
  errorHandler,
  healthRoute,
  logger,
  memoryRoute,
  requireAgentUser,
} from '@repo/agent';
import { handleCopilotKitRequest } from '@bff/copilotkit.js';

const app = new Hono();

app.use('*', honoLogger());
app.use(
  '*',
  cors({
    origin: corsOrigins,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-CopilotCloud-Public-Api-Key',
      'X-Request-Id',
      'X-User-Id',
      'X-User-Email',
      'X-User-Roles',
    ],
  }),
);

app.onError(errorHandler);

// Identity: verify Firebase Bearer on both the exact path and subpaths.
// Health stays public. CopilotKit's single-route client POSTs to /copilotkit.
app.use('/copilotkit', requireAgentUser);
app.use('/copilotkit/*', requireAgentUser);
app.use('/memory', requireAgentUser);
app.use('/memory/*', requireAgentUser);
app.use(LANGGRAPH_BASE_PATH, requireAgentUser);
app.use(`${LANGGRAPH_BASE_PATH}/*`, requireAgentUser);

// REST endpoints.
app.route('/health', healthRoute);
app.route('/memory', memoryRoute);

// Embedded LangGraph platform API (threads/runs over D1). The CopilotKit
// runtime's LangGraphAgent adapters call it over loopback with the caller's
// Firebase token, so the same middleware establishes the tenant on that hop.
app.route(LANGGRAPH_BASE_PATH, createLangGraphEmbedApp());

// CopilotKit runtime (LangGraphAgent adapters + embedded platform app).
app.all('/copilotkit', (c) => handleCopilotKitRequest(c.req.raw));
app.all('/copilotkit/*', (c) => handleCopilotKitRequest(c.req.raw));

serve({ fetch: app.fetch, port: env.AGENT_PORT }, (info) => {
  logger.info(`BFF ready at http://localhost:${info.port}`);
  logger.info(`  - CopilotKit runtime: POST /copilotkit`);
  logger.info(`  - Health:             GET  /health`);
  if (env.MEMORY_WORKER_URL) {
    logger.info(`  - Memory worker:      ${env.MEMORY_WORKER_URL}`);
  }
});
