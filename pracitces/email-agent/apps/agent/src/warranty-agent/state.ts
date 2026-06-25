// Libs for third party
import { Annotation } from "@langchain/langgraph";
import { CopilotKitStateAnnotation } from "@copilotkit/sdk-js/langgraph";

// Types
import type { WarrantyAssessment } from "./schemas/warranty";

/** LangGraph state for the multi-agent warranty workflow. */
export const WarrantyAgentState = Annotation.Root({
  ...CopilotKitStateAnnotation.spec,
  activeAgent: Annotation<string | undefined>,
  customerId: Annotation<string | undefined>,
  customerProfileSummary: Annotation<string | undefined>,
  retrievedDocs: Annotation<string[]>({
    reducer: (current, next) => current.concat(next),
    default: () => [],
  }),
  assessment: Annotation<WarrantyAssessment | undefined>,
  requiresHumanApproval: Annotation<boolean | undefined>,
  finalResponse: Annotation<string | undefined>,
  steps: Annotation<string[]>({
    reducer: (current, next) => current.concat(next),
    default: () => [],
  }),
});

export type WarrantyAgentStateType = typeof WarrantyAgentState.State;
