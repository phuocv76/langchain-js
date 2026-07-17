// Libs for third party
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';

// Internal
import {
  assertUserVerificationConfigured,
  corsOrigins,
  env,
} from '@agent/config/env.js';
import { handleCopilotKitRequest } from '@agent/copilotkit.js';
import { errorHandler } from '@agent/middleware/error.js';
import { requireAgentUser } from '@agent/middleware/agent-user-auth.js';
import { healthRoute } from '@agent/routes/health.route.js';
import { memoryRoute } from '@agent/routes/memory.route.js';
import { logger } from '@agent/utils/logger.js';

const app = new Hono();

app.use('*', honoLogger());
app.use(
  '*',
  cors({
    origin: corsOrigins,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      // Firebase ID token from the chat frontend.
      'Authorization',
      // CopilotKit client request headers.
      'X-CopilotCloud-Public-Api-Key',
      'X-Request-Id',
    ],
  }),
);

app.onError(errorHandler);

// The chat frontend calls this service directly with a Firebase bearer token.
// Every agent endpoint requires a verified end user; health remains public.
// A '/x/*' pattern matches both '/x' and its subpaths, so one registration
// per route is enough — registering '/x' as well would run auth twice.
app.use('/copilotkit/*', requireAgentUser);
app.use('/memory/*', requireAgentUser);

// REST endpoints.
app.route('/health', healthRoute);
app.route('/memory', memoryRoute);

// CopilotKit runtime (agents run in this process; D1 owns persistence).
app.all('/copilotkit', (c) => handleCopilotKitRequest(c.req.raw));
app.all('/copilotkit/*', (c) => handleCopilotKitRequest(c.req.raw));

// This process serves browsers directly, so production must be able to
// verify end-user tokens before it starts accepting requests.
assertUserVerificationConfigured();

serve({ fetch: app.fetch, port: env.AGENT_PORT }, (info) => {
  logger.info(`Agent API ready at http://localhost:${info.port}`);
  logger.info(`  - CopilotKit runtime: POST /copilotkit`);
  logger.info(`  - Health:             GET  /health`);
});
