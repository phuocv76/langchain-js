// Libs for third party
import { AIMessage } from "@langchain/core/messages";
import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";

// Internal
import {
  customerSupportAgent,
  policyRetrievalAgent,
  warrantyExpertAgent,
} from "./agents";
import { ensureCustomerProfile } from "./memory/long-term";
import { humanReview } from "./nodes/human-review";
import { WarrantyAgentState } from "./state";

// Types
import type { WarrantyAgentStateType } from "./state";

/** Loads long-term customer context into state before routing. */
const hydrateCustomerMemory = async (
  state: WarrantyAgentStateType,
  config: LangGraphRunnableConfig,
): Promise<Partial<WarrantyAgentStateType>> => {
  const customerId =
    state.customerId ??
    (config.configurable?.customerId as string | undefined) ??
    "guest";

  const profile = await ensureCustomerProfile(customerId);
  const summary = `Customer ${profile.customerId}: products=[${profile.products.join(", ")}], previousClaims=${profile.previousClaims}${profile.notes ? `, notes=${profile.notes}` : ""}`;

  return {
    customerId,
    customerProfileSummary: summary,
    steps: ["memory_hydrated"],
  };
};

const callCustomerAgent = async (
  state: WarrantyAgentStateType,
): Promise<Partial<WarrantyAgentStateType>> =>
  customerSupportAgent.invoke(state);

const callWarrantyAgent = async (
  state: WarrantyAgentStateType,
): Promise<Partial<WarrantyAgentStateType>> =>
  warrantyExpertAgent.invoke(state);

const callRetrievalAgent = async (
  state: WarrantyAgentStateType,
): Promise<Partial<WarrantyAgentStateType>> =>
  policyRetrievalAgent.invoke(state);

/** Routes to human review when flagged, otherwise ends on a final AI reply. */
const routeAfterAgent = (
  state: WarrantyAgentStateType,
):
  | "customerAgent"
  | "warrantyAgent"
  | "retrievalAgent"
  | "humanReview"
  | typeof END => {
  if (state.requiresHumanApproval || state.activeAgent === "humanReview") {
    return "humanReview";
  }

  const messages = state.messages ?? [];
  if (messages.length > 0) {
    const lastMsg = messages[messages.length - 1];
    if (AIMessage.isInstance(lastMsg) && !lastMsg.tool_calls?.length) {
      return END;
    }
  }

  const active = state.activeAgent ?? "customerAgent";
  if (active === "warrantyAgent") {
    return "warrantyAgent";
  }
  if (active === "retrievalAgent") {
    return "retrievalAgent";
  }
  if (active === "humanReview") {
    return "humanReview";
  }

  return "customerAgent";
};

const routeInitial = (
  state: WarrantyAgentStateType,
): "customerAgent" | "warrantyAgent" | "retrievalAgent" => {
  const active = state.activeAgent ?? "customerAgent";
  if (active === "warrantyAgent") {
    return "warrantyAgent";
  }
  if (active === "retrievalAgent") {
    return "retrievalAgent";
  }
  return "customerAgent";
};

/** Builds the multi-agent warranty StateGraph (uncompiled). */
const buildWorkflow = () => {
  const builder = new StateGraph(WarrantyAgentState)
    .addNode("hydrateMemory", hydrateCustomerMemory)
    .addNode("customerAgent", callCustomerAgent)
    .addNode("warrantyAgent", callWarrantyAgent)
    .addNode("retrievalAgent", callRetrievalAgent)
    .addNode("humanReview", humanReview);

  builder.addEdge(START, "hydrateMemory");
  builder.addConditionalEdges("hydrateMemory", routeInitial, [
    "customerAgent",
    "warrantyAgent",
    "retrievalAgent",
  ]);

  for (const node of [
    "customerAgent",
    "warrantyAgent",
    "retrievalAgent",
  ] as const) {
    builder.addConditionalEdges(node, routeAfterAgent, [
      "customerAgent",
      "warrantyAgent",
      "retrievalAgent",
      "humanReview",
      END,
    ]);
  }

  builder.addEdge("humanReview", END);
  return builder;
};

/** Compiled graph for the LangGraph dev server (checkpointer provided by server). */
export const graph = buildWorkflow().compile();

/** Compiles with in-memory checkpointing for CLI demos. */
export const compileWithMemory = () =>
  buildWorkflow().compile({ checkpointer: new MemorySaver() });
