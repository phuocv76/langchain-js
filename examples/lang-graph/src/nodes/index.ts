import type { AIMessage } from "@langchain/core/messages";
import { END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { model } from "../models/index.js";
import { tools } from "../tools/index.js";
import type { GraphStateType } from "../state/index.js";

const modelWithTools = model.bindTools(tools);

/** Runs the tools requested by the model's most recent message. */
export const toolNode = new ToolNode(tools);

/** Calls the LLM with the current conversation and returns its reply. */
export async function callModel(state: GraphStateType) {
  const response = await modelWithTools.invoke(state.messages);
  return { messages: [response] };
}

/** Routes to the tool node when the model asked for a tool, otherwise ends. */
export function shouldContinue(state: GraphStateType) {
  const lastMessage = state.messages.at(-1) as AIMessage | undefined;
  if (lastMessage?.tool_calls?.length) {
    return "tools";
  }
  return END;
}
