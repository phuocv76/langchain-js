"use client";

// Libs for third party
import { useCoAgent, useLangGraphInterrupt } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import { useState } from "react";

interface InterruptPayload {
  emailId?: string;
  subject?: string;
  originalEmail?: string;
  draftResponse?: string;
  urgency?: string;
  intent?: string;
  action?: string;
}

interface EmailAgentState {
  status?: string;
  subject?: string;
  senderEmail?: string;
  emailContent?: string;
  responseText?: string;
  classification?: {
    intent?: string;
    urgency?: string;
    topic?: string;
    summary?: string;
  };
}

const STATUS_LABELS: Record<string, string> = {
  email_loaded: "Email loaded",
  classified: "Classified",
  draft_ready: "Draft ready — review required",
  approved_by_human: "Approved — sending",
  reply_sent: "Reply sent (marked read in Gmail)",
  reply_sent_mark_unread: "Reply sent (could not mark read — missing email id)",
  rejected_by_human: "Reply rejected",
  no_unread_email: "No unread inbox email",
  send_skipped_missing_fields: "Send skipped — missing fields",
  skipped_no_email: "Skipped — no email content",
};

/** Maps internal status codes to user-facing labels. */
const formatStatus = (status: string | undefined): string => {
  if (!status) {
    return "idle";
  }
  return STATUS_LABELS[status] ?? status;
};

/** Renders human-in-the-loop review for draft email replies. */
const EmailReviewInterrupt = (): null => {
  const [editedDraft, setEditedDraft] = useState("");

  useLangGraphInterrupt<InterruptPayload>({
    render: ({ event, resolve }) => {
      const value = event.value;
      const draft = editedDraft || value.draftResponse || "";

      return (
        <div className="interrupt-card">
          <h3>Review email reply</h3>
          <p className="muted">{value.action}</p>
          <dl>
            <dt>Subject</dt>
            <dd>{value.subject ?? "(unknown)"}</dd>
            <dt>Intent</dt>
            <dd>
              {value.intent ?? "unknown"} / {value.urgency ?? "medium"}
            </dd>
          </dl>
          <details open>
            <summary>Original email</summary>
            <pre className="content-panel">
              {value.originalEmail ?? "(empty)"}
            </pre>
          </details>
          <label htmlFor="draft-editor">Draft reply</label>
          <textarea
            id="draft-editor"
            className="content-panel"
            rows={8}
            value={draft}
            onChange={(event) => setEditedDraft(event.target.value)}
          />
          <div className="actions">
            <button
              type="button"
              onClick={() => resolve(JSON.stringify({ action: "approve" }))}
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() =>
                resolve(
                  JSON.stringify({
                    action: "edit",
                    editedResponse: draft,
                  }),
                )
              }
            >
              Send edited
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => resolve(JSON.stringify({ action: "reject" }))}
            >
              Reject
            </button>
          </div>
        </div>
      );
    },
  });

  return null;
};

/** Live email-agent state panel and chat sidebar. */
const EmailAgentPanel = (): React.JSX.Element => {
  const { state } = useCoAgent<EmailAgentState>({
    name: "emailAgent",
    initialState: {},
  });

  return (
    <main className="page">
      <section className="hero">
        <h1>Email Agent</h1>
        <p>
          LangGraph workflow that reads Gmail, classifies intent, searches docs,
          drafts a reply, and pauses for human review before sending.
        </p>
      </section>

      <section className="status-card">
        <h2>Agent state</h2>
        <dl>
          <dt>Status</dt>
          <dd>{formatStatus(state.status)}</dd>
          <dt>Subject</dt>
          <dd>{state.subject ?? "—"}</dd>
          <dt>From</dt>
          <dd>{state.senderEmail ?? "—"}</dd>
          <dt>Intent</dt>
          <dd>
            {state.classification
              ? `${state.classification.intent} (${state.classification.urgency})`
              : "—"}
          </dd>
        </dl>

        {state.emailContent ? (
          <>
            <h3>Original email</h3>
            <pre className="content-panel">{state.emailContent}</pre>
          </>
        ) : null}

        {state.responseText ? (
          <>
            <h3>Draft reply</h3>
            <pre className="content-panel">{state.responseText}</pre>
          </>
        ) : null}
      </section>

      <EmailReviewInterrupt />
      <CopilotSidebar
        defaultOpen
        labels={{
          title: "Email Agent",
          initial:
            "Process the latest unread email or ask me to run the workflow.",
        }}
      />
    </main>
  );
};

/** Home page for the CopilotKit email agent UI. */
const HomePage = (): React.JSX.Element => <EmailAgentPanel />;

export default HomePage;
