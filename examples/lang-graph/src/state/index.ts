import type { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

/**
 * Shared graph state. We only track the running list of messages; the
 * `messagesStateReducer` appends new messages instead of overwriting them.
 *
 * This is functionally the same as the built-in `MessagesAnnotation`, written
 * out here to make the state definition explicit.
 */
export const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
});

export type GraphStateType = typeof GraphState.State;
