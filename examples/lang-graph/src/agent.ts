import { START, StateGraph } from "@langchain/langgraph";
import { GraphState } from "./state/index.js";
import { callModel, shouldContinue, toolNode } from "./nodes/index.js";

/**
 * The graph wires the pieces together:
 *
 *   START -> agent -> (tools -> agent)* -> END
 *
 * The `agent` node calls the model; if the model requests a tool we run it in
 * the `tools` node and loop back so the model can use the result.
 */
const workflow = new StateGraph(GraphState)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, ["tools", "__end__"])
  .addEdge("tools", "agent");

export const graph = workflow.compile();
