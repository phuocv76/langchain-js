import type { EmailStateType } from "../state.js";
import { createIssue, findExistingIssue } from "../integrations/github.js";

/** Bug Track: create (or reuse) a GitHub issue for the reported problem. */
export async function bugTrack(state: EmailStateType): Promise<Partial<EmailStateType>> {
  if (!state.email) throw new Error("bugTrack requires an email in state.");

  const { email, classification } = state;
  const title = classification?.topic
    ? `[Support] ${classification.topic}`
    : `[Support] ${email.subject}`;

  const existing = await findExistingIssue(classification?.topic ?? email.subject);
  if (existing) {
    return {
      issueRef: existing,
      status: [`Bug track: reused existing issue #${existing.number}`],
    };
  }

  const body = `Reported via support email.

**From:** ${email.from}
**Subject:** ${email.subject}
**Urgency:** ${classification?.urgency ?? "normal"}

---

${email.body || email.snippet}`;

  const labels = ["support"];
  if (classification?.urgency === "urgent" || classification?.urgency === "high") {
    labels.push("priority");
  }

  const issueRef = await createIssue({ title, body, labels });
  return {
    issueRef,
    status: [`Bug track: created issue #${issueRef.number} (${issueRef.url})`],
  };
}
