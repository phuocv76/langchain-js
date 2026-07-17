// Libs for third party
import { createCopilotRuntimeHandler } from '@copilotkit/runtime/v2';

// Internal
import { createCopilotRuntime } from '@agent/config/intelligence.js';

const BASE_PATH = '/copilotkit';

/**
 * Builds a CopilotKit v2 fetch handler wired to every agent in the registry.
 * Agents run in this process; there is no separate agent server behind it.
 *
 * @returns A `(Request) => Promise<Response>` handler mounted by Hono.
 */
const createCopilotKitHandler = (): ((
  request: Request,
) => Promise<Response>) => {
  const runtime = createCopilotRuntime();

  const multiRouteHandler = createCopilotRuntimeHandler({
    runtime,
    basePath: BASE_PATH,
    mode: 'multi-route',
  });

  const singleRouteHandler = createCopilotRuntimeHandler({
    runtime,
    basePath: BASE_PATH,
    mode: 'single-route',
  });

  const isBaseRuntimePath = (pathname: string): boolean =>
    pathname === BASE_PATH || pathname === `${BASE_PATH}/`;

  return async (request: Request): Promise<Response> => {
    const pathname = new URL(request.url, 'http://localhost').pathname;

    if (isBaseRuntimePath(pathname) && request.method === 'POST') {
      return singleRouteHandler(request);
    }

    return multiRouteHandler(request);
  };
};

/** Shared CopilotKit handler for the local Hono server. */
export const handleCopilotKitRequest = createCopilotKitHandler();
