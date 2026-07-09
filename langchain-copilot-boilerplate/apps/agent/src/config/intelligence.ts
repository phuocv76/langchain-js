// Libs for third party
import { CopilotKitIntelligence, CopilotRuntime } from '@copilotkit/runtime/v2';
import { LangGraphAgent } from '@copilotkit/runtime/langgraph';

// Internal
import { env } from '@agent/config/env.js';
import { AGENT_REGISTRY } from '@agent/graphs/registry.js';

const buildAgents = (deploymentUrl: string) =>
  Object.fromEntries(
    AGENT_REGISTRY.map((agent) => [
      agent.id,
      new LangGraphAgent({ deploymentUrl, graphId: agent.graphId }),
    ]),
  );

const a2uiConfig = {
  injectA2UITool: true,
} as const;

const isIntelligenceConfigured = (): boolean =>
  Boolean(
    env.INTELLIGENCE_API_URL &&
      env.INTELLIGENCE_GATEWAY_WS_URL &&
      env.INTELLIGENCE_API_KEY,
  );

const decodeHeaderValue = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/**
 * Resolves the signed-in user for Intelligence platform thread scoping.
 *
 * Replace with your auth provider in production (Clerk, Auth0, NextAuth, etc.).
 * For local dev, a stable default user id is used so threads accumulate under
 * one profile without implementing login first.
 */
const identifyIntelligenceUser = async (
  request: Request,
): Promise<{ id: string; name: string }> => {
  const id =
    decodeHeaderValue(request.headers.get('x-user-id')) ??
    env.INTELLIGENCE_DEV_USER_ID ??
    'local-dev-user';
  const name =
    decodeHeaderValue(request.headers.get('x-user-name')) ?? 'Local User';
  return { id, name };
};

/**
 * Creates the CopilotKit runtime.
 *
 * When Intelligence env vars are set, connects to the Enterprise Intelligence
 * Platform for durable threads, names, and realtime sidebar sync. Otherwise
 * falls back to in-memory thread storage (dev-only; lost on server restart).
 */
export const createCopilotRuntime = (deploymentUrl: string): CopilotRuntime => {
  const agents = buildAgents(deploymentUrl);

  if (!isIntelligenceConfigured()) {
    return new CopilotRuntime({ agents, a2ui: a2uiConfig });
  }

  const intelligence = new CopilotKitIntelligence({
    apiUrl: env.INTELLIGENCE_API_URL!,
    wsUrl: env.INTELLIGENCE_GATEWAY_WS_URL!,
    apiKey: env.INTELLIGENCE_API_KEY!,
  });

  return new CopilotRuntime({
    agents,
    a2ui: a2uiConfig,
    intelligence,
    identifyUser: identifyIntelligenceUser,
    generateThreadNames: true,
    licenseToken: env.COPILOTKIT_LICENSE_TOKEN,
  });
};

export const intelligenceEnabled = isIntelligenceConfigured();
