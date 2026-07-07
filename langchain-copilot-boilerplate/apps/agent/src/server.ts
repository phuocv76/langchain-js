// Libs for third party
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';

// Internal
import { corsOrigins, env } from './config/env.js';
import { handleCopilotKitRequest } from './copilotkit.js';
import { errorHandler } from './middleware/error.js';
import { chatRoute } from './routes/chat.route.js';
import { healthRoute } from './routes/health.route.js';
import { logger } from './utils/logger.js';

const app = new Hono();

app.use('*', honoLogger());
app.use(
  '*',
  cors({
    origin: corsOrigins,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.onError(errorHandler);

// REST endpoints.
app.route('/health', healthRoute);
app.route('/chat', chatRoute);

// CopilotKit runtime (proxies to the LangGraph dev server).
app.all('/copilotkit', (c) => handleCopilotKitRequest(c.req.raw));
app.all('/copilotkit/*', (c) => handleCopilotKitRequest(c.req.raw));

serve({ fetch: app.fetch, port: env.AGENT_PORT }, (info) => {
  logger.info(`Agent API ready at http://localhost:${info.port}`);
  logger.info(`  - CopilotKit runtime: POST /copilotkit`);
  logger.info(`  - Streaming chat:     POST /chat`);
  logger.info(`  - Health:             GET  /health`);
});
