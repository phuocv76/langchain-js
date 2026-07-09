// Libs for third party
import { CopilotKitStateAnnotation } from '@copilotkit/sdk-js/langgraph';
import { Annotation } from '@langchain/langgraph';

/**
 * State shared between the CopilotKit frontend and the LangGraph agent.
 * `copilotkit` and `messages` are required by the CopilotKit middleware.
 */
export const DefaultAgentStateSchema = Annotation.Root({
  ...CopilotKitStateAnnotation.spec,
});

export type DefaultAgentStateType = typeof DefaultAgentStateSchema.State;
