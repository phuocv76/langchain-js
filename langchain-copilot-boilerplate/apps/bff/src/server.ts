import { serve } from '@hono/node-server';

import { env, logger } from '@repo/agent';
import { createBffApp } from '@bff/app.js';

const app = createBffApp();

serve({ fetch: app.fetch, port: env.AGENT_PORT }, (info) => {
  logger.info(`BFF ready at http://localhost:${info.port}`);
  logger.info(`  - CopilotKit runtime: POST /copilotkit`);
  logger.info(`  - Health:             GET  /health`);
  if (env.MEMORY_WORKER_URL) {
    logger.info(`  - Memory worker:      ${env.MEMORY_WORKER_URL}`);
  }
});
