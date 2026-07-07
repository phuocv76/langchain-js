// Libs for third party
import { CopilotKitStateAnnotation } from '@copilotkit/sdk-js/langgraph';
import { Annotation } from '@langchain/langgraph';

/**
 * Example custom state for the default agent.
 *
 * The current agent uses `createAgent` with its built-in message state, so this
 * annotation is NOT wired in by default. It is provided as a starting point for
 * when you migrate to a hand-built `StateGraph` and need domain fields alongside
 * the CopilotKit channels.
 *
 * Usage sketch:
 *   const graph = new StateGraph(DefaultAgentState) ... .compile();
 */
export const DefaultAgentState = Annotation.Root({
  ...CopilotKitStateAnnotation.spec,
  // Example domain field — accumulates across turns.
  scratchpad: Annotation<string[]>({
    reducer: (current, next) => current.concat(next),
    default: () => [],
  }),
});

export type DefaultAgentStateType = typeof DefaultAgentState.State;
