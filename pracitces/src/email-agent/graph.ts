// Libs for third party
import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";

// Internal
import { bugTrack } from "./nodes/bug-track.js";
import { classifyIntent } from "./nodes/classify-intent.js";
import { docSearch } from "./nodes/doc-search.js";
import { draftReply } from "./nodes/draft-reply.js";
import { humanReview } from "./nodes/human-review.js";
import { readEmail } from "./nodes/read-email.js";
import { sendReply } from "./nodes/send-reply.js";
import { EmailAgentState } from "./state.js";

/** Builds the email agent StateGraph (uncompiled). */
const buildWorkflow = () =>
  new StateGraph(EmailAgentState)
    .addNode("readEmail", readEmail)
    .addNode("classifyIntent", classifyIntent, {
      ends: ["docSearch", "bugTrack", "draftReply", END],
    })
    .addNode("docSearch", docSearch, { ends: ["draftReply"] })
    .addNode("bugTrack", bugTrack, { ends: ["draftReply"] })
    .addNode("draftReply", draftReply, { ends: ["humanReview"] })
    .addNode("humanReview", humanReview, {
      ends: ["sendReply", "draftReply", END],
    })
    .addNode("sendReply", sendReply)
    .addEdge(START, "readEmail")
    .addEdge("readEmail", "classifyIntent")
    .addEdge("sendReply", END);

/**
 * Compiled graph for the LangGraph dev server (checkpointer provided by server).
 */
export const graph = buildWorkflow().compile();

/**
 * Compiles the graph with an in-memory checkpointer for the CLI runner.
 */
export const compileWithMemory = () =>
  buildWorkflow().compile({ checkpointer: new MemorySaver() });
