// Libs for third party
import { copilotkitMiddleware } from "@copilotkit/sdk-js/langgraph";
import { createAgent } from "langchain";

// Internal
import { getChatModel } from "../../lib/model";
import { warrantyScopeGuardrailMiddleware } from "../middleware/guardrail";
import {
  searchWarrantyDocsTool,
  transferBackToWarranty,
  transferToHuman,
  transferToRetrieval,
  transferToWarranty,
} from "../tools/handoffs";

/** Front-line agent that triages warranty-related questions. */
export const customerSupportAgent = createAgent({
  model: getChatModel(),
  tools: [transferToWarranty],
  systemPrompt: `You are a customer support agent for a retail electronics and appliance store.
Greet the customer and clarify their product and issue.
For warranty coverage, claim eligibility, or repair/refund questions, call transfer_to_warranty.
Do not invent policy details — defer to specialists.`,
  middleware: [copilotkitMiddleware, warrantyScopeGuardrailMiddleware],
});

/** Specialist that interprets warranty rules and dates. */
export const warrantyExpertAgent = createAgent({
  model: getChatModel(),
  tools: [transferToRetrieval, transferToHuman],
  systemPrompt: `You are a warranty expert.
Interpret purchase dates, product categories, and coverage windows.
Call transfer_to_retrieval when you need exact policy language from manuals.
Call transfer_to_human when estimated cost is $500+, terms are ambiguous, or the case is high risk.
When you can decide confidently, explain coverage clearly and mention next steps.`,
  middleware: [copilotkitMiddleware, warrantyScopeGuardrailMiddleware],
});

/** RAG agent that retrieves policy excerpts and returns context. */
export const policyRetrievalAgent = createAgent({
  model: getChatModel(),
  tools: [searchWarrantyDocsTool, transferBackToWarranty],
  systemPrompt: `You are a policy retrieval agent.
Use search_warranty_docs to find relevant warranty terms, return policy, and FAQ excerpts.
Summarize what you found, then call transfer_to_warranty_from_retrieval so the warranty expert can decide.`,
  middleware: [copilotkitMiddleware, warrantyScopeGuardrailMiddleware],
});
