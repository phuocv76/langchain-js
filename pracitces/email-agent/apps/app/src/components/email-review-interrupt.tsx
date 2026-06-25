// Libs for third party
import { useLangGraphInterrupt } from "@copilotkit/react-core";

// Internal
import { InterruptReviewCard } from "@/components/interrupt-review-card";
import { useInterruptDraft } from "@/hooks/use-interrupt-draft";

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
    case "high":
      return "interrupt-card__badge--high";
    case "low":
      return "interrupt-card__badge--low";
    default:
      return "interrupt-card__badge--medium";
  }
};

/** Renders human-in-the-loop review for draft email replies inside the chat. */
export const EmailReviewInterrupt = (): null => {
  const { getDraft, setDraft } = useInterruptDraft();

  useLangGraphInterrupt<InterruptPayload>({
    render: ({ event, resolve }) => {
      const value = event.value;
      const draft = getDraft(value.draftResponse);
      const intent = value.intent ?? "unknown";
      const urgency = value.urgency ?? "medium";

      return (
        <InterruptReviewCard
          title="Review email reply"
          subtitle={value.action}
          badges={
            <>
              <span className="interrupt-card__badge">{intent}</span>
              <span
                className={`interrupt-card__badge ${urgencyClass(urgency)}`}
              >
                {urgency}
              </span>
            </>
          }
          draftLabel="Draft reply"
          draftId="draft-editor"
          draft={draft}
          onDraftChange={setDraft}
          onResolve={resolve}
        >
          <dl className="interrupt-card__meta">
            <dt>Subject</dt>
            <dd>{value.subject ?? "(unknown)"}</dd>
          </dl>

          <details className="interrupt-card__details" open>
            <summary>Original email</summary>
            <pre className="interrupt-card__panel">
              {value.originalEmail ?? "(empty)"}
            </pre>
          </details>
        </InterruptReviewCard>
      );
    },
  });

  return null;
};
