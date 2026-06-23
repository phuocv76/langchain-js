import { Annotation } from "@langchain/langgraph";
import { CopilotKitStateAnnotation } from "@copilotkit/sdk-js/langgraph";
import type {
  Classification,
  DocHit,
  IssueRef,
  ParsedEmail,
  ReviewDecision,
} from "./types.js";

const lastValue = <T>() => ({
  reducer: (_prev: T, next: T) => next,
});

/**
 * Shared graph state for the email agent. Every field is JSON-serializable so it
 * can be persisted by a checkpointer and streamed to the CopilotKit UI.
 *
 * Spreading CopilotKitStateAnnotation adds the `messages` and `copilotkit`
 * channels that the AG-UI / CopilotKit bridge expects (Phase 3).
 */
export const EmailState = Annotation.Root({
  ...CopilotKitStateAnnotation.spec,
  email: Annotation<ParsedEmail | null>({ ...lastValue(), default: () => null }),
  classification: Annotation<Classification | null>({ ...lastValue(), default: () => null }),
  docHits: Annotation<DocHit[]>({ ...lastValue(), default: () => [] }),
  issueRef: Annotation<IssueRef | null>({ ...lastValue(), default: () => null }),
  draft: Annotation<string>({ ...lastValue(), default: () => "" }),
  decision: Annotation<ReviewDecision | null>({ ...lastValue(), default: () => null }),
  sent: Annotation<boolean>({ ...lastValue(), default: () => false }),
  /** Human-readable progress trail, useful for CLI logs and UI state. */
  status: Annotation<string[]>({
    reducer: (prev: string[], next: string[]) => prev.concat(next),
    default: () => [],
  }),
});

export type EmailStateType = typeof EmailState.State;

/** Config the graph reads from `configurable`. */
export interface EmailConfigurable {
  /** When true, humanReview approves without pausing (Phase 1 CLI). */
  autoApprove?: boolean;
  /** Read this specific Gmail message id instead of the latest unread. */
  emailId?: string;
}
