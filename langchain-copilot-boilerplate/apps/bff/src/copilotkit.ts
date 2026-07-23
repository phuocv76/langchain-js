// Libs for third party
import { createCopilotHonoHandler } from '@copilotkit/runtime/v2';

// Internal
import {
  type LangGraphFetch,
  corsOrigins,
  createCopilotRuntime,
} from '@repo/agent';

const BASE_PATH = '/copilotkit';

interface CopilotKitHandlerOptions {
  readonly langgraphFetch: LangGraphFetch;
}

/**
 * Builds the CopilotKit Hono handlers. Agents are stock LangGraphAgent
 * adapters calling the BFF's embedded LangGraph platform app (`/langgraph`)
 * through an in-process Fetch transport with the caller's verified token;
 * checkpoints and thread metadata live in D1.
 *
 * The React client POSTs to the base path (single-route envelope). Other
 * clients may hit multi-route paths (`/agent/:id/run`, `/info`, …). Dispatch
 * on method + pathname so both work.
 */
export const createCopilotKitRequestHandler = ({
  langgraphFetch,
}: CopilotKitHandlerOptions): ((request: Request) => Promise<Response>) => {
  const runtime = createCopilotRuntime({ langgraphFetch });
  const cors = {
    origin: corsOrigins,
    credentials: true,
  } as const;

  const multiRouteApp = createCopilotHonoHandler({
    runtime,
    basePath: BASE_PATH,
    mode: 'multi-route',
    cors,
  });

  const singleRouteApp = createCopilotHonoHandler({
    runtime,
    basePath: BASE_PATH,
    mode: 'single-route',
    cors,
  });

  const isBaseRuntimePath = (pathname: string): boolean =>
    pathname === BASE_PATH || pathname === `${BASE_PATH}/`;

  return async (request: Request): Promise<Response> => {
    const pathname = new URL(request.url, 'http://localhost').pathname;

    if (isBaseRuntimePath(pathname) && request.method === 'POST') {
      return Promise.resolve(singleRouteApp.fetch(request));
    }

    return Promise.resolve(multiRouteApp.fetch(request));
  };
};
