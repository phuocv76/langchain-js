// Libs for third party
import { CopilotKitStateSchema } from '@copilotkit/sdk-js/langgraph';
import { StateSchema } from '@langchain/langgraph';
import { z } from 'zod/v4';

export interface TrustedAgentStateContext {
  readonly requestId: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly roles: string[];
  readonly threadId: string;
}

/**
 * State shared between the CopilotKit frontend and the LangGraph agent.
 * `copilotkit` and `messages` are required by the CopilotKit middleware.
 */
export const DefaultAgentStateSchema = new StateSchema({
  ...CopilotKitStateSchema.fields,
  /** Verified identity metadata only; raw Firebase credentials are never state. */
  agentContext: z
    .object({
      requestId: z.string(),
      userId: z.string(),
      tenantId: z.string(),
      roles: z.array(z.string()),
      threadId: z.string(),
    })
    .optional(),
  /** Bounded, sanitized transcript excerpts retrieved before the model call. */
  retrievedMemory: z.array(z.string()).optional(),
  /** Durable-memory write ids emitted after the agent completes. */
  memoryWriteIds: z.array(z.string()).optional(),
});

export type DefaultAgentStateType = typeof DefaultAgentStateSchema.State;
