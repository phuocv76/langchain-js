// Libs for third party
import { serve } from '@hono/node-server';
import {
  createCopilotHonoHandler,
  type CopilotRuntime,
} from '@copilotkit/runtime/v2';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';

// Internal
import { LANGGRAPH_BASE_PATH } from '../config/copilot-runtime.js';
import { corsOrigins, env } from '../config/env.js';
import { requireAgentUser } from '../middleware/agent-user-auth.js';
import { errorHandler } from '../middleware/error.js';
import { createHealthRoute } from '../routes/health.route.js';
import { memoryRoute } from '../routes/memory.route.js';
import { logger } from '../utils/logger.js';

const COPILOTKIT_BASE_PATH = '/copilotkit';

/**
 * CopilotKit request dispatch: the React client POSTs to the base path
 * (single-route envelope); other clients hit multi-route paths
 * (`/agent/:id/run`, `/info`, …). Dispatch on method + pathname so both work.
 */
export const createCopilotKitRequestHandler = (
  runtime: CopilotRuntime,
): ((request: Request) => Promise<Response>) => {
  const corsOptions = { origin: corsOrigins, credentials: true } as const;

  const multiRouteApp = createCopilotHonoHandler({
    runtime,
    basePath: COPILOTKIT_BASE_PATH,
    mode: 'multi-route',
    cors: corsOptions,
  });

  const singleRouteApp = createCopilotHonoHandler({
    runtime,
    basePath: COPILOTKIT_BASE_PATH,
    mode: 'single-route',
    cors: corsOptions,
  });

  const isBaseRuntimePath = (pathname: string): boolean =>
    pathname === COPILOTKIT_BASE_PATH || pathname === `${COPILOTKIT_BASE_PATH}/`;

  return async (request: Request): Promise<Response> => {
    const pathname = new URL(request.url, 'http://localhost').pathname;

    if (isBaseRuntimePath(pathname) && request.method === 'POST') {
      return Promise.resolve(singleRouteApp.fetch(request));
    }

    return Promise.resolve(multiRouteApp.fetch(request));
  };
};

export interface AgentServerOptions {
  /** Product-wired embedded LangGraph platform app (threads/runs over D1). */
  readonly embedApp: Hono;
  /** CopilotKit runtime over the product's agent registry. */
  readonly copilotRuntime: CopilotRuntime;
  /** Reported by `GET /health`; defaults to "agent-server". */
  readonly serviceName?: string;
}

/**
 * Standard agent BFF composition shared by every product server: CORS,
 * request logging, Firebase identity on every protected surface, the
 * CopilotKit runtime, the embedded LangGraph platform app, and the
 * transcript/health REST routes. Products supply only their wiring
 * (see each app's `graphs/registry.ts`).
 */
export const createAgentServerApp = ({
  embedApp,
  copilotRuntime,
  serviceName = 'agent-server',
}: AgentServerOptions): Hono => {
  const handleCopilotKit = createCopilotKitRequestHandler(copilotRuntime);
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
      ],
    }),
  );

  app.onError(errorHandler);

  // Identity: verify Firebase Bearer on both the exact path and subpaths.
  // Health stays public. CopilotKit's single-route client POSTs to /copilotkit.
  app.use(COPILOTKIT_BASE_PATH, requireAgentUser);
  app.use(`${COPILOTKIT_BASE_PATH}/*`, requireAgentUser);
  app.use('/memory', requireAgentUser);
  app.use('/memory/*', requireAgentUser);
  app.use(LANGGRAPH_BASE_PATH, requireAgentUser);
  app.use(`${LANGGRAPH_BASE_PATH}/*`, requireAgentUser);

  // REST endpoints.
  app.route('/health', createHealthRoute(serviceName));
  app.route('/memory', memoryRoute);

  // Embedded LangGraph platform API (threads/runs over D1). The CopilotKit
  // runtime's LangGraphAgent adapters call it over loopback with the caller's
  // Firebase token, so the same middleware establishes the tenant on that hop.
  app.route(LANGGRAPH_BASE_PATH, embedApp);

  // CopilotKit runtime (LangGraphAgent adapters + embedded platform app).
  app.all(COPILOTKIT_BASE_PATH, (c) => handleCopilotKit(c.req.raw));
  app.all(`${COPILOTKIT_BASE_PATH}/*`, (c) => handleCopilotKit(c.req.raw));

  return app;
};

/** Boots the agent server on `AGENT_PORT` with standard startup logging. */
export const startAgentServer = (options: AgentServerOptions): void => {
  const app = createAgentServerApp(options);
  serve({ fetch: app.fetch, port: env.AGENT_PORT }, (info) => {
    logger.info(
      `${options.serviceName ?? 'agent-server'} ready at http://localhost:${info.port}`,
    );
    logger.info(`  - CopilotKit runtime: POST /copilotkit`);
    logger.info(`  - Health:             GET  /health`);
    if (env.MEMORY_WORKER_URL) {
      logger.info(`  - Memory worker:      ${env.MEMORY_WORKER_URL}`);
    }
  });
};
