// Libs for third party
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';

// Internal
import {
  corsOrigins,
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

// REST endpoints.
app.route('/health', healthRoute);
app.route('/memory', memoryRoute);

// CopilotKit runtime (in-process graph + D1 checkpoints).
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
