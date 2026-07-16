// Libs for third party
import { ToolMessage } from '@langchain/core/messages';
import { createMiddleware } from 'langchain';

// Internal
import {
  DurableMemoryStateSchema,
  type TrustedAgentStateContext,
} from '@agent/middleware/durable-memory-state.js';
import { isApiConfigured } from '@agent/services/api-client.js';
import { executeWorkspaceTool } from '@agent/services/workspace-api.js';
import { isWorkspaceTool, workspaceTools } from '@agent/tools/workspace.tools.js';

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

    const identity = (
      request.state as { agentContext?: TrustedAgentStateContext }
    ).agentContext;
    if (!identity) {
      throw new Error('Trusted agent context is unavailable');
    }

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
