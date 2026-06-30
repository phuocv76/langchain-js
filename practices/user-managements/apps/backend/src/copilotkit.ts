import {
  CopilotRuntime,
  createCopilotRuntimeHandler,
} from '@copilotkit/runtime/v2';
import { LangGraphAgent } from '@copilotkit/runtime/langgraph';

const BASE_PATH = '/api/copilotkit';

/** Builds a CopilotKit fetch handler for the given LangGraph deployment URL. */
export const createCopilotKitHandler = (deploymentUrl: string) => {
  const agents = {
    userManagementAgent: new LangGraphAgent({
      deploymentUrl,
      graphId: 'userManagementAgent',
    }),
  };

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

const defaultDeploymentUrl =
  process.env.LANGGRAPH_DEPLOYMENT_URL ?? 'http://localhost:2024';

/** Shared CopilotKit v2 handler for local Node dev. */
export const handleCopilotKitRequest =
  createCopilotKitHandler(defaultDeploymentUrl);
