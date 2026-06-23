// Libs for third party
import { Annotation } from "@langchain/langgraph";
import { CopilotKitStateAnnotation } from "@copilotkit/sdk-js/langgraph";

// Types
import type { EmailClassification, ReviewDecision } from "./types.js";

/** LangGraph state for the read-and-reply email agent. */
export const EmailAgentState = Annotation.Root({
  ...CopilotKitStateAnnotation.spec,
  emailId: Annotation<string | undefined>,
  threadId: Annotation<string | undefined>,
  senderEmail: Annotation<string | undefined>,
  subject: Annotation<string | undefined>,
  emailContent: Annotation<string | undefined>,
  classification: Annotation<EmailClassification | undefined>,
  searchResults: Annotation<string[]>({
    reducer: (current, next) => current.concat(next),
    default: () => [],
  }),
  responseText: Annotation<string | undefined>,
  /** Latest reviewer decision; cleared after draftReply consumes edit feedback. */
  decision: Annotation<ReviewDecision | undefined>,
  status: Annotation<string | undefined>,
  /** Append-only progress trail persisted by the checkpointer (CLI memory demo). */
  steps: Annotation<string[]>({
    reducer: (current, next) => current.concat(next),
    default: () => [],
  }),
});

export type EmailAgentStateType = typeof EmailAgentState.State;
