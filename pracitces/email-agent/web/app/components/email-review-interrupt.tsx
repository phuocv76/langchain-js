'use client';

// Libs for third party
import { useLangGraphInterrupt } from '@copilotkit/react-core';
import { useState } from 'react';

interface InterruptPayload {
  emailId?: string;
  subject?: string;
  originalEmail?: string;
  draftResponse?: string;
  urgency?: string;
  intent?: string;
  action?: string;
}

/** Maps urgency to a badge CSS modifier. */
const urgencyClass = (urgency: string | undefined): string => {
  switch (urgency?.toLowerCase()) {
    case 'high':
      return 'interrupt-card__badge--high';
    case 'low':
      return 'interrupt-card__badge--low';
    default:
      return 'interrupt-card__badge--medium';
  }
};

/** Renders human-in-the-loop review for draft email replies inside the chat. */
export const EmailReviewInterrupt = (): null => {
  const [editedDraft, setEditedDraft] = useState('');

  useLangGraphInterrupt<InterruptPayload>({
    render: ({ event, resolve }) => {
      const value = event.value;
      const draft = editedDraft || value.draftResponse || '';
      const intent = value.intent ?? 'unknown';
      const urgency = value.urgency ?? 'medium';

      return (
        <div className="interrupt-card">
          <header className="interrupt-card__header">
            <div>
              <h3 className="interrupt-card__title">Review email reply</h3>
              <p className="interrupt-card__subtitle">{value.action}</p>
            </div>
            <div className="interrupt-card__badges">
              <span className="interrupt-card__badge">{intent}</span>
              <span
                className={`interrupt-card__badge ${urgencyClass(urgency)}`}
              >
                {urgency}
              </span>
            </div>
          </header>

          <dl className="interrupt-card__meta">
            <dt>Subject</dt>
            <dd>{value.subject ?? '(unknown)'}</dd>
          </dl>

          <details className="interrupt-card__details" open>
            <summary>Original email</summary>
            <pre className="interrupt-card__panel">
              {value.originalEmail ?? '(empty)'}
            </pre>
          </details>

          <label className="interrupt-card__label" htmlFor="draft-editor">
            Draft reply
          </label>
          <textarea
            id="draft-editor"
            className="interrupt-card__panel interrupt-card__textarea"
            rows={8}
            value={draft}
            onChange={(event) => setEditedDraft(event.target.value)}
          />

          <footer className="interrupt-card__actions">
            <button
              type="button"
              className="interrupt-card__btn interrupt-card__btn--primary"
              onClick={() => resolve(JSON.stringify({ action: 'approve' }))}
            >
              Approve
            </button>
            <button
              type="button"
              className="interrupt-card__btn interrupt-card__btn--secondary"
              onClick={() =>
                resolve(
                  JSON.stringify({
                    action: 'edit',
                    editedResponse: draft,
                  }),
                )
              }
            >
              Send edited
            </button>
            <button
              type="button"
              className="interrupt-card__btn interrupt-card__btn--danger"
              onClick={() => resolve(JSON.stringify({ action: 'reject' }))}
            >
              Reject
            </button>
          </footer>
        </div>
      );
    },
  });

  return null;
};
