// Libs for third party
import { ToolMessage } from '@langchain/core/messages';
import { createMiddleware } from 'langchain';

// Internal
import { AGENT_HEADER_ACCESS_TOKEN } from '@repo/shared';
import {
  DurableMemoryStateSchema,
  type TrustedAgentStateContext,
} from '@repo/agent-runtime';
import {
  type ActingIdentity,
  isApiConfigured,
} from '@agent/services/api-client.js';
import { executeWorkspaceTool } from '@agent/services/workspace-api.js';
import { isWorkspaceTool, workspaceTools } from '@agent/tools/workspace.tools.js';

/** Reads the verified Firebase ID token from LangGraph run configurable. */
const readAccessToken = (runtime: unknown): string | undefined => {
  const configurable = (runtime as { configurable?: Record<string, unknown> })
    .configurable;
  const token = configurable?.[AGENT_HEADER_ACCESS_TOKEN];
  return typeof token === 'string' && token ? token : undefined;
};

/**
 * Executes the read-only workspace tools with the verified acting identity
 * from graph state (populated by the durable-memory middleware). Tools are
 * only advertised to the model when the product API is configured, so an
 * unconfigured deployment never exposes dead tools.
 */
export const workspaceToolsMiddleware = createMiddleware({
  name: 'WorkspaceToolsMiddleware',
  // Declaring the shared schema lets this middleware read `agentContext`
  // from state — hooks only see fields their own schema declares.
  stateSchema: DurableMemoryStateSchema,
  tools: isApiConfigured() ? workspaceTools : [],
  wrapToolCall: async (request, handler) => {
    if (!isWorkspaceTool(request.toolCall.name)) return handler(request);

    const agentContext = (
      request.state as { agentContext?: TrustedAgentStateContext }
    ).agentContext;
    const accessToken = readAccessToken(request.runtime);
    if (!agentContext || !accessToken) {
      throw new Error('Trusted agent context is unavailable');
    }

    const identity: ActingIdentity = { ...agentContext, accessToken };
    const content = await executeWorkspaceTool(
      request.toolCall.name,
      request.toolCall.args,
      identity,
    );

    return new ToolMessage({
      content,
      tool_call_id: request.toolCall.id ?? request.toolCall.name,
      name: request.toolCall.name,
    });
  },
});
