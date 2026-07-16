// Libs for third party
import { CopilotRuntime } from '@copilotkit/runtime/v2';
import { LangGraphAgent } from '@copilotkit/runtime/langgraph';

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

/** Creates the CopilotKit runtime; D1 owns durable transcript history. */
export const createCopilotRuntime = (deploymentUrl: string): CopilotRuntime => {
  const agents = buildAgents(deploymentUrl);

  return new CopilotRuntime({
    agents,
    a2ui: a2uiConfig,
    forwardHeaders: {
      allow: [
        'x-agent-request-id',
        'x-agent-user-id',
        'x-agent-user-email',
        'x-agent-roles',
      ],
    },
  });
};
