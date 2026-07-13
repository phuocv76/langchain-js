// Libs for third party
import { CopilotKitStateSchema } from '@copilotkit/sdk-js/langgraph';
import { StateSchema, UntrackedValue } from '@langchain/langgraph';

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
  agentContext: new UntrackedValue<TrustedAgentStateContext>(),
  /** Bounded, sanitized transcript excerpts retrieved before the model call. */
  retrievedMemory: new UntrackedValue<string[]>(),
  /** Durable-memory write ids emitted after the agent completes. */
  memoryWriteIds: new UntrackedValue<string[]>(),
});

export type DefaultAgentStateType = typeof DefaultAgentStateSchema.State;
