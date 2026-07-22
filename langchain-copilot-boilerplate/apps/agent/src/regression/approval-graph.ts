/**
 * Regression-only HITL graph: one gate node that pauses on `interrupt()` and, once
 * resumed, records the decision as the assistant reply. Compiled WITHOUT a
 * checkpointer on purpose — the embed server must inject D1CheckpointSaver
 * for interrupt state to survive between the two runs.
 */

// Libs for third party
import { AIMessage } from '@langchain/core/messages';
import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
  interrupt,
} from '@langchain/langgraph';

const gate = (_state: typeof MessagesAnnotation.State) => {
  const decision = interrupt({ question: 'Approve the deploy?' });
  return {
    messages: [new AIMessage(`decision: ${String(decision)}`)],
  };
};

export const approvalGraph = new StateGraph(MessagesAnnotation)
  .addNode('gate', gate)
  .addEdge(START, 'gate')
  .addEdge('gate', END)
  .compile();
