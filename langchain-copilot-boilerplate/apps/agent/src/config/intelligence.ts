// Libs for third party
import { CopilotRuntime } from '@copilotkit/runtime/v2';
import type { AbstractAgent } from '@ag-ui/client';

// Internal
import { createWorkspaceBridgeAgent } from '@agent/agents/workspace-agent/agui-bridge.js';
import { AGENT_REGISTRY } from '@agent/graphs/registry.js';
import {
  readRoles,
  type AgentUserContext,
} from '@agent/middleware/agent-user-auth.js';

/**
 * Rebuilds the verified identity from the sanitized `x-agent-*` headers.
 *
 * The Hono auth middleware verified the Firebase ID token and overwrote
 * these headers on the request before the CopilotKit handler ran, so their
 * values are trustworthy — a client-supplied header can never survive that
 * middleware. Requests that somehow bypass it fail here instead of running
 * without an identity.
 */
const identityFromRequest = (request: Request): AgentUserContext => {
  const header = (name: string): string | undefined =>
    request.headers.get(name) ?? undefined;
  const requestId = header('x-agent-request-id');
  const userId = header('x-agent-user-id');
  const email = header('x-agent-user-email');
  const rolesHeader = header('x-agent-roles');
  if (!requestId || !userId || !email || !rolesHeader) {
    throw new Error('CopilotKit runtime reached without a verified user');
  }
  const roles = readRoles(JSON.parse(decodeURIComponent(rolesHeader)));
  if (!roles) {
    throw new Error('CopilotKit runtime reached with malformed role claims');
  }
  return { requestId, userId, email, roles };
};

const a2uiConfig = {
  injectA2UITool: true,
} as const;

/**
 * Creates the CopilotKit runtime serving the in-process agents.
 *
 * Agents are built per request so each run closes over the identity verified
 * for exactly that call; D1 owns all persistence (transcript ledger and
 * engine checkpoints alike).
 */
export const createCopilotRuntime = (): CopilotRuntime =>
  new CopilotRuntime({
    agents: ({ request }) => {
      const user = identityFromRequest(request);
      return Object.fromEntries(
        AGENT_REGISTRY.map((agent) => [
          agent.id,
          createWorkspaceBridgeAgent(user),
        ]),
      ) as Record<string, AbstractAgent> & { [key: string]: AbstractAgent };
    },
    a2ui: a2uiConfig,
  });
