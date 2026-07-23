// Libs for third party
import { LangGraphAgent } from '@ag-ui/langgraph';
import { CopilotRuntime } from '@copilotkit/runtime/v2';
import { Client } from '@langchain/langgraph-sdk';

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
 * Fetch-compatible transport for the BFF's embedded LangGraph app.
 * The BFF supplies an in-process implementation, avoiding TCP loopback so the
 * same runtime works in both Node.js and Cloudflare Workers.
 */
export type LangGraphFetch = typeof fetch;

export interface CopilotRuntimeOptions {
  readonly langgraphFetch: LangGraphFetch;
}

/**
 * Creates the CopilotKit runtime. Each request builds fresh LangGraphAgent
 * adapters that call the BFF's own embedded LangGraph app (`/langgraph`)
 * through an injected Fetch transport, re-presenting the caller's verified
 * Firebase ID token so
 * `requireAgentUser` establishes the tenant on that hop too.
 *
 * Identity claims are NOT sent via `assistantConfig`: the adapter filters
 * custom configurable keys out of its run payload, so the embed app rebuilds
 * `config.configurable` server-side from the verified `x-agent-*` headers
 * (see `withVerifiedRunClaims` in services/langgraph-embed-app.ts).
 * Checkpoints and thread metadata live in D1 via the memory worker; durable
 * transcript history stays in D1 via `/memory`.
 */
export const createCopilotRuntime = ({
  langgraphFetch,
}: CopilotRuntimeOptions): CopilotRuntime =>
  new CopilotRuntime({
    agents: ({ request }) => {
      const user = identityFromRequest(request);
      const deploymentUrl = `https://bff.internal${LANGGRAPH_BASE_PATH}`;
      return Object.fromEntries(
        AGENT_REGISTRY.map((agent) => [
          agent.id,
          new LangGraphAgent({
            // Client has private fields, so TypeScript treats SDK copies as
            // nominally distinct even when their public API is identical.
            // The workspace pins one runtime version; this annotation also
            // prevents stale editor paths from creating a false mismatch.
            client: new Client({
              apiUrl: deploymentUrl,
              apiKey: null,
              defaultHeaders: {
                Authorization: `Bearer ${user.accessToken}`,
              },
              callerOptions: {
                fetch: langgraphFetch,
              },
            }) as unknown as LangGraphAgent['client'],
            deploymentUrl,
            graphId: agent.graphId,
          }),
        ]),
      );
    },
    openGenerativeUI: true,
    a2ui: a2uiConfig,
    licenseToken: env.COPILOTKIT_LICENSE_TOKEN,
  });
