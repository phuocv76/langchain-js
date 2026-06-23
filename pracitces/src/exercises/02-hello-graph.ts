/**
 * Exercise 02 — Hello Graph
 * Goal: build a minimal LangGraph StateGraph with one model node.
 *
 * Run: npm run exercise src/exercises/02-hello-graph.ts
 */
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { getChatModel } from "../lib/model.js";

async function main() {
  const model = getChatModel();

  const callModel = async (state: typeof MessagesAnnotation.State) => {
    const response = await model.invoke(state.messages);
    return { messages: [response] };
  };

  const graph = new StateGraph(MessagesAnnotation)
    .addNode("model", callModel)
    .addEdge("__start__", "model")
    .addEdge("model", "__end__")
    .compile();

  const result = await graph.invoke({
    messages: [new HumanMessage("Give me a one-line definition of a state graph.")],
  });

  const last = result.messages.at(-1);
  console.log(last?.content);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
