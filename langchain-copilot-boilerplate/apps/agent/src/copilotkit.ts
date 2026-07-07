// Libs for third party
import {
  CopilotRuntime,
  createCopilotRuntimeHandler,
} from '@copilotkit/runtime/v2';
import { LangGraphAgent } from '@copilotkit/runtime/langgraph';

// Internal
import { env } from './config/env.js';
import { AGENT_REGISTRY } from './graphs/registry.js';

const BASE_PATH = '/copilotkit';

/**
 * Builds a CopilotKit v2 fetch handler wired to every agent in the registry.
 *
 * @param deploymentUrl - URL of the LangGraph server hosting the graphs.
 * @returns A `(Request) => Promise<Response>` handler mounted by Hono.
 */
export const createCopilotKitHandler = (
  deploymentUrl: string,
): ((request: Request) => Promise<Response>) => {
  const agents = Object.fromEntries(
    AGENT_REGISTRY.map((agent) => [
      agent.id,
      new LangGraphAgent({ deploymentUrl, graphId: agent.graphId }),
    ]),
  );

  const runtime = new CopilotRuntime({ agents });

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
export const handleCopilotKitRequest = createCopilotKitHandler(
  env.LANGGRAPH_DEPLOYMENT_URL,
);
