// Libs for third party
import { CopilotKitStateSchema } from '@copilotkit/sdk-js/langgraph';
import { StateSchema } from '@langchain/langgraph';

/**
 * State shared between the CopilotKit frontend and the LangGraph agent.
 * `copilotkit` and `messages` are required by the CopilotKit middleware.
 */
export const DefaultAgentStateSchema = new StateSchema({
  ...CopilotKitStateSchema.fields,
});

export type DefaultAgentStateType = typeof DefaultAgentStateSchema.State;
