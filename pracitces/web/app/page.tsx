"use client";

import { useState } from "react";
import { useCoAgent, useLangGraphInterrupt } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";

interface EmailAgentState {
  email?: { from: string; subject: string; body: string } | null;
  classification?: { urgency: string; topic: string; route: string; reason: string } | null;
  docHits?: { source: string; content: string }[];
  issueRef?: { number: number; url: string; title: string } | null;
  draft?: string;
  sent?: boolean;
  status?: string[];
}

interface InterruptValue {
  draft: string;
  email?: { from: string; subject: string } | null;
}

function ReviewCard({
  value,
  resolve,
}: {
  value: InterruptValue;
  resolve: (resolution: string) => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const send = (resolution: { action: string; feedback?: string }) => {
    setSubmitted(true);
    resolve(JSON.stringify(resolution));
  };

  return (
    <div className="review">
      <h2>Review the drafted reply</h2>
      <p className="draft">{value.draft}</p>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Optional: describe changes to request a revision"
        disabled={submitted}
      />
      <div className="actions">
        <button className="btn primary" disabled={submitted} onClick={() => send({ action: "approve" })}>
          Approve & Send
        </button>
        <button
          className="btn"
          disabled={submitted || !feedback.trim()}
          onClick={() => send({ action: "edit", feedback })}
        >
          Request changes
        </button>
        <button className="btn" disabled={submitted} onClick={() => send({ action: "reject" })}>
          Reject
        </button>
      </div>
    </div>
  );
}

function StatePanel({ state }: { state: EmailAgentState }) {
  const { email, classification, docHits, issueRef, draft, sent, status } = state;

  return (
    <>
      <div className="card">
        <h2>Email</h2>
        {email ? (
          <div>
            <div>
              <strong>{email.subject}</strong>
            </div>
            <div className="empty">{email.from}</div>
          </div>
        ) : (
          <p className="empty">No email read yet.</p>
        )}
      </div>

      {classification && (
        <div className="card">
          <h2>Classification</h2>
          <span className="pill">{classification.urgency}</span>
          <span className="pill">{classification.topic}</span>
          <span className="pill">{classification.route}</span>
          <p className="empty" style={{ marginBottom: 0 }}>
            {classification.reason}
          </p>
        </div>
      )}

      {issueRef && (
        <div className="card">
          <h2>Filed issue</h2>
          <a href={issueRef.url} target="_blank" rel="noreferrer">
            #{issueRef.number} {issueRef.title}
          </a>
        </div>
      )}

      {docHits && docHits.length > 0 && (
        <div className="card">
          <h2>Knowledge base</h2>
          <ul className="steps">
            {docHits.map((d, i) => (
              <li key={i}>{d.source}</li>
            ))}
          </ul>
        </div>
      )}

      {draft && (
        <div className="card">
          <h2>Draft reply {sent ? "(sent)" : ""}</h2>
          <p className="draft">{draft}</p>
        </div>
      )}

      {status && status.length > 0 && (
        <div className="card">
          <h2>Workflow steps</h2>
          <ul className="steps">
            {status.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export default function Page() {
  const { state } = useCoAgent<EmailAgentState>({
    name: "emailAgent",
    initialState: {},
  });

  useLangGraphInterrupt<InterruptValue>({
    render: ({ event, resolve }) => <ReviewCard value={event.value} resolve={resolve} />,
  });

  return (
    <main className="page">
      <h1 className="title">Email Agent</h1>
      <p className="subtitle">
        Ask the assistant to &ldquo;process my inbox&rdquo;. It reads the latest unread email,
        classifies it, searches docs or files a bug, drafts a reply, and pauses here for your
        approval before sending.
      </p>

      <StatePanel state={state ?? {}} />

      <CopilotSidebar
        defaultOpen
        clickOutsideToClose={false}
        labels={{
          title: "Email Agent",
          initial: "Hi! Tell me to \"process my inbox\" and I'll handle the latest unread email.",
        }}
      />
    </main>
  );
}
