import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";

export const graph = new StateGraph(MessagesAnnotation)
  .addNode("noop", async () => ({}))
  .addEdge("__start__", "noop")
  .addEdge("noop", "__end__")
  .compile();
