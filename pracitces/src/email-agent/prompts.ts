import type { Classification, DocHit, IssueRef, ParsedEmail } from "./types.js";

export const CLASSIFY_SYSTEM = `You triage incoming support emails.
Classify the email's urgency and topic, then choose the next action:
- "bugTrack": the email reports a bug, outage, error, or broken behavior that should become a tracked issue.
- "docSearch": the email asks a question or how-to that our knowledge base likely answers.
- "draftReply": anything else (acknowledgements, simple replies) that needs no lookup.
Be decisive and concise.`;

export function classifyHuman(email: ParsedEmail): string {
  return `From: ${email.from}
Subject: ${email.subject}

${email.body || email.snippet}`;
}

export const DRAFT_SYSTEM = `You are a helpful, professional support agent.
Write a concise, friendly email reply (plain text, no subject line).
Ground your answer in the provided knowledge-base excerpts when present.
If an issue was filed, reference its number and link so the customer can follow along.
Do not invent facts that are not in the email or the excerpts.`;

export function draftHuman(input: {
  email: ParsedEmail;
  classification: Classification | null;
  docHits: DocHit[];
  issueRef: IssueRef | null;
  feedback?: string;
}): string {
  const { email, classification, docHits, issueRef, feedback } = input;

  const docs = docHits.length
    ? docHits.map((d, i) => `[Doc ${i + 1} - ${d.source}]\n${d.content}`).join("\n\n")
    : "(none)";

  const issue = issueRef
    ? `Issue #${issueRef.number}: ${issueRef.title} (${issueRef.url})`
    : "(none)";

  const revision = feedback
    ? `\n\nThe reviewer requested changes. Apply this feedback:\n${feedback}`
    : "";

  return `Original email:
From: ${email.from}
Subject: ${email.subject}
${email.body || email.snippet}

Detected topic: ${classification?.topic ?? "unknown"} (urgency: ${classification?.urgency ?? "normal"})

Knowledge-base excerpts:
${docs}

Filed issue:
${issue}${revision}

Write the reply now.`;
}
