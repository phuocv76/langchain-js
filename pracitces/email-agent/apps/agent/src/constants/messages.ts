/** CopilotKit chat copy shown after key workflow events. */
export const UI = {
  formatReplySent: (recipient: string, subject: string): string =>
    `Reply sent successfully to ${recipient} — Re: ${subject}`,
} as const;

/** Graph state status codes. */
export const STATUS = {
  EMAIL_LOADED: "email_loaded",
  NO_UNREAD_EMAIL: "no_unread_email",
  SKIPPED_NO_EMAIL: "skipped_no_email",
  CLASSIFIED: "classified",
  DOCS_SEARCHED: "docs_searched",
  BUG_TRACKED: "bug_tracked",
  DRAFT_READY: "draft_ready",
  DRAFT_REVISION_REQUESTED: "draft_revision_requested",
  APPROVED_BY_HUMAN: "approved_by_human",
  REJECTED_BY_HUMAN: "rejected_by_human",
  SEND_SKIPPED_MISSING_FIELDS: "send_skipped_missing_fields",
  REPLY_SENT: "reply_sent",
  REPLY_SENT_MARK_UNREAD: "reply_sent_mark_unread",
} as const;

/** Fallback values when state or payload fields are missing. */
export const PLACEHOLDERS = {
  UNKNOWN: "(unknown)",
  NONE: "(none)",
  EMPTY: "(empty)",
  EMPTY_BODY: "(empty body)",
  NO_SUBJECT: "(no subject)",
  UNKNOWN_INTENT: "unknown",
  UNKNOWN_VALUE: "unknown",
  MEDIUM_URGENCY: "medium",
  GENERAL_TOPIC: "general",
  DEFAULT_REPLY_SUBJECT: "Your message",
  CUSTOMER_REPORT: "Customer report",
  DEFAULT_EDIT_FEEDBACK: "Please improve the draft.",
} as const;

/** Append-only step trail messages. */
export const STEPS = {
  SCOPE_CHECK_PASSED: "Scope check: in-domain request",
  SCOPE_CHECK_REJECTED: "Scope check: rejected off-topic request",
  READ_EMAIL_NO_UNREAD: "Read email: no unread messages in inbox",
  DOC_SEARCH_COMPLETED: "Documentation search completed",
  BUG_TRACK_FILED: "Bug report filed on GitHub",
  DRAFT_REPLY_GENERATED: "Draft reply: generated",
  DRAFT_REPLY_REVISED: "Draft reply: revised per reviewer feedback",
  HUMAN_REVIEW_REJECTED: "Human review: rejected",
  HUMAN_REVIEW_EDITED_INLINE: "Human review: edited inline and approved",
  HUMAN_REVIEW_EDIT_REQUESTED: "Human review: edit requested — redrafting",
  HUMAN_REVIEW_APPROVED: "Human review: approved",
  SEND_REPLY_SKIPPED: "Send reply: skipped — missing required fields",
  SEND_REPLY_DISPATCHED_NO_MARK:
    "Send reply: dispatched (could not mark read — missing email id)",
  SEND_REPLY_SUCCESS: "Send reply: dispatched and marked read in Gmail",
} as const;

/** Builds the step message after a successful email read. */
export const formatReadEmailLoaded = (subject: string, from: string): string =>
  `Read email: "${subject}" from ${from}`;

/** Builds the step message after intent classification. */
export const formatClassified = (intent: string, urgency: string): string =>
  `Classified: ${intent} (${urgency})`;

/** Human review interrupt and default prompts. */
export const REVIEW = {
  INTERRUPT_ACTION: "Review and approve, edit, or reject this draft reply.",
  DEFAULT_PROMPT: "Review this draft reply.",
} as const;

/** CLI console output labels and prompts. */
export const CLI = {
  HUMAN_REVIEW_HEADER: "\n--- Human review (interrupt) ---",
  SUBJECT_LABEL: "Subject:",
  INTENT_LABEL: "Intent:",
  ORIGINAL_EMAIL_HEADER: "\nOriginal email:\n",
  DRAFT_REPLY_HEADER: "\nDraft reply:\n",
  OPTIONS: "\nOptions: [a]pprove  [e]dit  [r]eject",
  CHOICE_PROMPT: "Choice (a/e/r): ",
  EDIT_FEEDBACK_PROMPT: "What should change? (draft will be regenerated)\n",
  STEPS_SO_FAR_HEADER: "\n--- Steps so far ---",
  DONE_HEADER: "\n--- Done ---",
  STATUS_LABEL: "Status:",
  SUBJECT_OUTPUT_LABEL: "Subject:",
  CLASSIFICATION_LABEL: "Classification:",
  REPLY_SENT_LABEL: "Reply sent:",
  FINAL_STEPS_HEADER: "\n--- Final steps ---",
  STEP_PREFIX: "- ",
  formatThreadMemory: (threadId: string, stepCount: number): string =>
    `\nThread "${threadId}" remembers ${stepCount} step(s).`,
} as const;

/** LLM prompt templates. */
export const PROMPTS = {
  CLASSIFY_INTENT: (
    subject: string,
    sender: string,
    emailContent: string,
  ): string => `
Analyze this customer email and classify it:

Subject: ${subject}
From: ${sender}
Email:
${emailContent}

Provide intent, urgency, topic, and a one-line summary.
`,

  DRAFT_REPLY: (params: {
    subject: string;
    sender: string;
    emailContent: string;
    intent: string;
    urgency: string;
    topic: string;
    contextSections: string;
    feedbackSection: string;
  }): string => `
Draft a professional reply to this customer email:

Subject: ${params.subject}
From: ${params.sender}
Email:
${params.emailContent}

Intent: ${params.intent}
Urgency: ${params.urgency}
Topic: ${params.topic}

${params.contextSections}
${params.feedbackSection}

Guidelines:
- Be concise, helpful, and professional
- Address the customer's specific concern
- Reference documentation when relevant
- Do not invent ticket numbers or policies not provided in context
`,

  RELEVANT_DOCUMENTATION_HEADER: "Relevant documentation:\n",

  formatFeedbackSection: (previousDraft: string, feedback: string): string => `
Previous draft:
${previousDraft}

Reviewer feedback (revise accordingly):
${feedback}
`,
} as const;

/** Integration and search result messages. */
export const INTEGRATIONS = {
  DOC_SEARCH_NO_MATCHES: "No matching documentation snippets were found.",
  formatDocSearchUnavailable: (message: string): string =>
    `Documentation search unavailable: ${message}`,
  formatGitHubIssueCreated: (number: number, url: string): string =>
    `GitHub issue #${number} created: ${url}`,
  formatBugTrackingUnavailable: (message: string): string =>
    `Bug tracking unavailable: ${message}`,
  BUG_ISSUE_TITLE_PREFIX: "[Email Bug]",
  BUG_ISSUE_BODY_HEADER: "## Reported via email agent",
  BUG_ISSUE_FROM_LABEL: "**From:**",
  BUG_ISSUE_SUBJECT_LABEL: "**Subject:**",
  BUG_ISSUE_BODY_SECTION: "### Email body",
  GMAIL_REPLY_PREFIX: "Re:",
  GMAIL_CONTENT_TYPE: "Content-Type: text/plain; charset=utf-8",
} as const;

/** Error messages thrown when required configuration is missing. */
export const ERRORS = {
  OPENAI_API_KEY: "Set OPENAI_API_KEY in .env before running exercises.",
  GMAIL_CREDENTIALS:
    "Gmail credentials missing. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in .env.",
  GITHUB_TOKEN: "Set GITHUB_TOKEN in .env before filing GitHub issues.",
  GITHUB_REPO: 'Set GITHUB_REPO in "owner/repo" form.',
} as const;

/** In-chat guardrail messages when user input is outside agent scope. */
export const GUARDRAILS = {
  NEWS: "This message is outside my scope. I only cover AI news — please ask about artificial intelligence, LLMs, or related topics.",
  EMAIL:
    "This message is outside my scope. I handle email support workflows — ask about Gmail, drafting replies, bugs, or billing.",
  WARRANTY:
    "This message is outside my scope. I only handle warranty and return questions — describe your product, purchase date, and issue.",
} as const;

/** Keyword patterns for per-agent scope guardrails. */
export const GUARDRAIL_KEYWORDS = {
  NEWS: /\b(ai|artificial intelligence|llm|gpt|openai|anthropic|machine learning|model|agent|neural|deep learning|news|headline|summarize|summary)\b/i,
  EMAIL:
    /\b(email|gmail|inbox|reply|draft|support|bug|billing|customer|message|thread|issue|ticket|feature|password|account|refund|invoice)\b/i,
  WARRANTY:
    /\b(warranty|return|refund|repair|policy|product|appliance|claim|coverage|broken|defect|replace|exchange|purchase|receipt|tv|washer|dryer|fridge|laptop|phone)\b/i,
} as const;
