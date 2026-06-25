import {
  CopilotKitIntelligence,
  CopilotRuntime,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";
import { LangGraphAgent } from "@copilotkit/runtime/langgraph";

const deploymentUrl =
  process.env.LANGGRAPH_DEPLOYMENT_URL ?? "http://localhost:2024";

/** Intelligence credentials — supports CLI (`INTELLIGENCE_*`) and manual (`COPILOTKIT_*`) names. */
const readIntelligenceEnv = (): {
  apiKey: string | undefined;
  apiUrl: string | undefined;
  wsUrl: string | undefined;
} => ({
  apiKey:
    process.env.COPILOTKIT_INTELLIGENCE_API_KEY?.trim() ||
    process.env.INTELLIGENCE_API_KEY?.trim(),
  apiUrl:
    process.env.COPILOTKIT_INTELLIGENCE_API_URL?.trim() ||
    process.env.INTELLIGENCE_API_URL?.trim(),
  wsUrl:
    process.env.COPILOTKIT_INTELLIGENCE_WS_URL?.trim() ||
    process.env.INTELLIGENCE_GATEWAY_WS_URL?.trim(),
});

const intelligenceEnv = readIntelligenceEnv();

/**
 * Intelligence mode needs a project-scoped API URL and WebSocket URL from the
 * CopilotKit CLI — an API key alone is not enough and breaks agent runs.
 */
const hasCompleteIntelligenceConfig = (): boolean =>
  Boolean(intelligenceEnv.apiKey) &&
  Boolean(intelligenceEnv.apiUrl) &&
  Boolean(intelligenceEnv.wsUrl);

/** Builds Intelligence client when full project credentials are configured. */
const buildIntelligence = (): CopilotKitIntelligence | undefined => {
  if (!intelligenceEnv.apiKey) {
    return undefined;
  }

  if (!hasCompleteIntelligenceConfig()) {
    console.warn(
      "[copilotkit] Intelligence API key found without INTELLIGENCE_API_URL and " +
        "INTELLIGENCE_GATEWAY_WS_URL — using local mode (chat works; history is " +
        "session-only). Run `npx copilotkit@latest project select` to enable " +
        "cloud-saved threads.",
    );
    return undefined;
  }

  return new CopilotKitIntelligence({
    apiUrl: intelligenceEnv.apiUrl!,
    wsUrl: intelligenceEnv.wsUrl!,
    apiKey: intelligenceEnv.apiKey!,
  });
};

const intelligence = buildIntelligence();

const agents = {
  emailAgent: new LangGraphAgent({
    deploymentUrl,
    graphId: "emailAgent",
  }),
};

const runtime = intelligence
  ? new CopilotRuntime({
      agents,
      intelligence,
      identifyUser: () => ({ id: "local-dev-user", name: "Local Dev User" }),
      generateThreadNames: false,
    })
  : new CopilotRuntime({ agents });

const BASE_PATH = "/api/copilotkit";
const THREADS_PATH = `${BASE_PATH}/threads`;

const multiRouteHandler = createCopilotRuntimeHandler({
  runtime,
  basePath: BASE_PATH,
  mode: "multi-route",
});

const singleRouteHandler = createCopilotRuntimeHandler({
  runtime,
  basePath: BASE_PATH,
  mode: "single-route",
});

/** Returns true when the request targets the CopilotKit base path (no subpath). */
const isBaseRuntimePath = (pathname: string): boolean =>
  pathname === BASE_PATH || pathname === `${BASE_PATH}/`;

/**
 * When Intelligence credentials are invalid, the cloud API returns 404/401 and
 * the stock handler surfaces a 500. Return an empty thread list so the sidebar
 * stays usable while cloud history is misconfigured.
 */
const softenThreadListFailure = async (
  response: Response,
): Promise<Response> => {
  if (response.status !== 500) {
    return response;
  }

  console.warn(
    "[copilotkit] Intelligence thread list failed — returning empty list. " +
      "Verify INTELLIGENCE_API_URL, INTELLIGENCE_GATEWAY_WS_URL, and " +
      "INTELLIGENCE_API_KEY from `npx copilotkit@latest project select`.",
  );

  return Response.json({ threads: [], nextCursor: null });
};

/**
 * Shared CopilotKit v2 handler for `/api/copilotkit` and subpaths.
 */
export const handleCopilotKitRequest = async (
  request: Request,
): Promise<Response> => {
  const pathname = new URL(request.url, "http://localhost").pathname;

  if (isBaseRuntimePath(pathname) && request.method === "POST") {
    return singleRouteHandler(request);
  }

  const response = await multiRouteHandler(request);

  if (intelligence && pathname === THREADS_PATH && request.method === "GET") {
    return softenThreadListFailure(response);
  }

  return response;
};
