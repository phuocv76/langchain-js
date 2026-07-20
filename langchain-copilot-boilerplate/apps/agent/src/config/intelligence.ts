// Libs for third party
import { CopilotRuntime } from '@copilotkit/runtime/v2';

// Internal
import { createWorkspaceBridgeAgent } from '@agent/agents/workspace-agent/agui-bridge.js';
import { env } from '@agent/config/env.js';
import { AGENT_REGISTRY } from '@agent/graphs/registry.js';
import { identityFromRequest } from '@agent/middleware/agent-user-auth.js';

const a2uiConfig = {
  injectA2UITool: false,
} as const;

/**
 * Creates the CopilotKit runtime that runs the workspace graph in-process.
 * Checkpoint/resume uses D1CheckpointSaver (or MemorySaver when
 * MEMORY_WORKER_URL is unset). Durable transcript history stays in D1 via
 * `/memory` + the memory worker; CopilotKit Intelligence is not used.
 */
export const createCopilotRuntime = (): CopilotRuntime =>
  new CopilotRuntime({
    // Per-request agents so each run carries the verified Firebase identity
    // into AsyncLocalStorage for D1 checkpoint scoping.
    agents: ({ request }) => {
      const user = identityFromRequest(request);
      return Object.fromEntries(
        AGENT_REGISTRY.map((agent) => [
          agent.id,
          createWorkspaceBridgeAgent(user),
        ]),
      );
    },
    openGenerativeUI: true,
    a2ui: a2uiConfig,
    licenseToken: env.COPILOTKIT_LICENSE_TOKEN,
  });
