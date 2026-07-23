// Libs for third party
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';

// Internal
import {
  LANGGRAPH_BASE_PATH,
  corsOrigins,
  createLangGraphEmbedApp,
  errorHandler,
  healthRoute,
  memoryRoute,
  requireAgentUser,
} from '@repo/agent';
import { createCopilotKitRequestHandler } from '@bff/copilotkit.js';

/**
 * Build the BFF application for either Node.js or Cloudflare Workers.
 *
 * The LangGraph adapter uses this app's fetch handler for its internal
 * `/langgraph` request, so the Worker never needs a localhost TCP server.
 */
export const createBffApp = (): Hono => {
  const app = new Hono();
  const handleCopilotKitRequest = createCopilotKitRequestHandler({
    langgraphFetch: async (input, init) =>
      Promise.resolve(app.fetch(new Request(input, init))),
  });

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

  app.route('/health', healthRoute);
  app.route('/memory', memoryRoute);

  // Embedded LangGraph platform API (threads/runs over D1).
  app.route(LANGGRAPH_BASE_PATH, createLangGraphEmbedApp());

  app.all('/copilotkit', (c) => handleCopilotKitRequest(c.req.raw));
  app.all('/copilotkit/*', (c) => handleCopilotKitRequest(c.req.raw));

  return app;
};
