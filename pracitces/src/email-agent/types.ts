/** Shared domain types for the email agent. */

export interface ParsedEmail {
  /** Gmail message id. */
  id: string;
  /** Gmail thread id (used to send a threaded reply). */
  threadId: string;
  /** RFC822 Message-Id header, used for In-Reply-To/References when replying. */
  rfcMessageId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  snippet: string;
}

export type Urgency = "low" | "normal" | "high" | "urgent";

/** Where classifyIntent routes the email next. */
export type Route = "bugTrack" | "docSearch" | "draftReply";

export interface Classification {
  urgency: Urgency;
  topic: string;
  /** Short, human-readable reason for the chosen route. */
  reason: string;
  route: Route;
}

export interface DocHit {
  source: string;
  content: string;
  score?: number;
}

export interface IssueRef {
  number: number;
  url: string;
  title: string;
}

export type ReviewAction = "approve" | "edit" | "reject";

export interface ReviewDecision {
  action: ReviewAction;
  /** When action === "edit", the human-provided guidance or replacement text. */
  feedback?: string;
}
