// Libs for third party
import { serve } from '@hono/node-server';
// Internal
import { app } from '@agent/app.js';
import { env } from '@agent/config/env.js';
import { logger } from '@agent/utils/logger.js';

serve({ fetch: app.fetch, port: env.AGENT_PORT }, (info) => {
  logger.info(`Agent API ready at http://localhost:${info.port}`);
  logger.info(`  - CopilotKit runtime: POST /copilotkit`);
  logger.info(`  - Streaming chat:     POST /chat`);
  logger.info(`  - Health:             GET  /health`);
});
