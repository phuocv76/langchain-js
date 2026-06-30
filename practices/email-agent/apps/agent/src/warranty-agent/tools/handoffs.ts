// Libs for third party
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { tool, type ToolRuntime } from "@langchain/core/tools";
import { Command } from "@langchain/langgraph";
import { z } from "zod";

// Internal
import { retrieveWarrantyDocs } from "../rag/vector-store";

// Types
import type { WarrantyAgentStateType } from "../state";

/** Finds the most recent AI message for handoff context transfer. */
const lastAiMessage = (messages: unknown[]): AIMessage | undefined =>
  [...messages].reverse().find(AIMessage.isInstance);

/** Handoff from customer support to the warranty specialist. */
export const transferToWarranty = tool(
  async (_input, runtime: ToolRuntime<WarrantyAgentStateType>) => {
    const aiMessage = lastAiMessage(runtime.state.messages ?? []);

    return new Command({
      goto: "warrantyAgent",
      update: {
        activeAgent: "warrantyAgent",
        messages: [
          aiMessage,
          new ToolMessage({
            content: "Transferred to warranty specialist.",
            tool_call_id: runtime.toolCallId,
          }),
        ].filter(Boolean),
      },
      graph: Command.PARENT,
    });
  },
  {
    name: "transfer_to_warranty",
    description:
      "Transfer the conversation to the warranty specialist for coverage and claim questions.",
    schema: z.object({}),
  },
);

/** Handoff from warranty expert to the policy retrieval agent. */
export const transferToRetrieval = tool(
  async (_input, runtime: ToolRuntime<WarrantyAgentStateType>) => {
    const aiMessage = lastAiMessage(runtime.state.messages ?? []);

    return new Command({
      goto: "retrievalAgent",
      update: {
        activeAgent: "retrievalAgent",
        messages: [
          aiMessage,
          new ToolMessage({
            content: "Transferred to policy retrieval agent.",
            tool_call_id: runtime.toolCallId,
          }),
        ].filter(Boolean),
      },
      graph: Command.PARENT,
    });
  },
  {
    name: "transfer_to_retrieval",
    description:
      "Transfer to the retrieval agent to search warranty manuals and policy documents.",
    schema: z.object({}),
  },
);

/** Handoff from any specialist to human approval workflow. */
export const transferToHuman = tool(
  async (_input, runtime: ToolRuntime<WarrantyAgentStateType>) => {
    const aiMessage = lastAiMessage(runtime.state.messages ?? []);

    return new Command({
      goto: "humanReview",
      update: {
        activeAgent: "humanReview",
        requiresHumanApproval: true,
        messages: [
          aiMessage,
          new ToolMessage({
            content: "Escalated to human approval.",
            tool_call_id: runtime.toolCallId,
          }),
        ].filter(Boolean),
      },
      graph: Command.PARENT,
    });
  },
  {
    name: "transfer_to_human",
    description:
      "Escalate to a human reviewer when cost exceeds $500, policy is unclear, or legal risk exists.",
    schema: z.object({}),
  },
);

/** Handoff back to warranty expert after document retrieval. */
export const transferBackToWarranty = tool(
  async (_input, runtime: ToolRuntime<WarrantyAgentStateType>) => {
    const aiMessage = lastAiMessage(runtime.state.messages ?? []);

    return new Command({
      goto: "warrantyAgent",
      update: {
        activeAgent: "warrantyAgent",
        messages: [
          aiMessage,
          new ToolMessage({
            content:
              "Returned to warranty specialist with retrieved documents.",
            tool_call_id: runtime.toolCallId,
          }),
        ].filter(Boolean),
      },
      graph: Command.PARENT,
    });
  },
  {
    name: "transfer_to_warranty_from_retrieval",
    description:
      "Return to the warranty specialist after fetching policy excerpts.",
    schema: z.object({}),
  },
);

/** RAG tool for searching warranty documentation. */
export const searchWarrantyDocsTool = tool(
  async ({ query }: { query: string }): Promise<string> => {
    const snippets = await retrieveWarrantyDocs(query);
    return snippets.join("\n\n---\n\n");
  },
  {
    name: "search_warranty_docs",
    description:
      "Search warranty terms, return policy, and FAQ documents for relevant excerpts.",
    schema: z.object({
      query: z
        .string()
        .describe("Policy question or product keywords to search"),
    }),
  },
);
