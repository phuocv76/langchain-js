import { END, START, StateGraph, MemorySaver } from "@langchain/langgraph";
import { EmailState, type EmailStateType } from "./state.js";
import { readEmail } from "./nodes/read-email.js";
import { classifyIntent } from "./nodes/classify-intent.js";
import { docSearch } from "./nodes/doc-search.js";
import { bugTrack } from "./nodes/bug-track.js";
import { draftReply } from "./nodes/draft-reply.js";
import { humanReview } from "./nodes/human-review.js";
import { sendReply } from "./nodes/send-reply.js";

/** classifyIntent -> next node based on the chosen route. */
function routeAfterClassify(state: EmailStateType): "bugTrack" | "docSearch" | "draftReply" {
  return state.classification?.route ?? "draftReply";
}

/** humanReview -> send, revise, or stop based on the reviewer's decision. */
function routeAfterReview(state: EmailStateType): "sendReply" | "draftReply" | typeof END {
  switch (state.decision?.action) {
    case "approve":
      return "sendReply";
    case "edit":
      return "draftReply";
    default:
      return END;
  }
}

export const emailBuilder = new StateGraph(EmailState)
  .addNode("readEmail", readEmail)
  .addNode("classifyIntent", classifyIntent)
  .addNode("docSearch", docSearch)
  .addNode("bugTrack", bugTrack)
  .addNode("draftReply", draftReply)
  .addNode("humanReview", humanReview)
  .addNode("sendReply", sendReply)
  .addEdge(START, "readEmail")
  .addEdge("readEmail", "classifyIntent")
  .addConditionalEdges("classifyIntent", routeAfterClassify, [
    "bugTrack",
    "docSearch",
    "draftReply",
  ])
  .addEdge("docSearch", "draftReply")
  .addEdge("bugTrack", "draftReply")
  .addEdge("draftReply", "humanReview")
  .addConditionalEdges("humanReview", routeAfterReview, ["sendReply", "draftReply", END])
  .addEdge("sendReply", END);

/**
 * Compiled graph WITHOUT a checkpointer, exported for the `langgraphjs dev`
 * server (the platform provides its own persistence). See langgraph.json.
 */
export const graph = emailBuilder.compile();

/** Compile with an in-memory checkpointer for local CLI runs (interrupts + memory). */
export function compileWithMemory() {
  return emailBuilder.compile({ checkpointer: new MemorySaver() });
}
