// Libs for third party
import { LangGraphAgent } from '@ag-ui/langgraph';
import { CopilotRuntime } from '@copilotkit/runtime/v2';

// Internal
import { env } from '@agent/config/env.js';
import { AGENT_REGISTRY } from '@agent/graphs/registry.js';
import { identityFromRequest } from '@agent/middleware/agent-user-auth.js';

const a2uiConfig = {
  injectA2UITool: false,
} as const;

/** Base path where the BFF mounts the embedded LangGraph platform app. */
export const LANGGRAPH_BASE_PATH = '/langgraph';

/**
 * Creates the CopilotKit runtime. Each request builds fresh LangGraphAgent
 * adapters that call the BFF's own embedded LangGraph app (`/langgraph`)
 * over loopback, re-presenting the caller's verified Firebase ID token so
 * `requireAgentUser` establishes the tenant on that hop too.
 *
 * Identity claims are NOT sent via `assistantConfig`: the adapter filters
 * custom configurable keys out of its run payload, so the embed app rebuilds
 * `config.configurable` server-side from the verified `x-agent-*` headers
 * (see `withVerifiedRunClaims` in services/langgraph-embed-app.ts).
 * Checkpoints and thread metadata live in D1 via the memory worker; durable
 * transcript history stays in D1 via `/memory`.
 */
export const createCopilotRuntime = (): CopilotRuntime =>
  new CopilotRuntime({
    agents: ({ request }) => {
      const user = identityFromRequest(request);
      return Object.fromEntries(
        AGENT_REGISTRY.map((agent) => [
          agent.id,
          new LangGraphAgent({
            deploymentUrl: `http://127.0.0.1:${env.AGENT_PORT}${LANGGRAPH_BASE_PATH}`,
            graphId: agent.graphId,
            headerFactory: () => ({
              Authorization: `Bearer ${user.accessToken}`,
            }),
          }),
        ]),
      );
    },
    openGenerativeUI: true,
    a2ui: a2uiConfig,
    licenseToken: env.COPILOTKIT_LICENSE_TOKEN,
  });
