// Libs for third party
import { useLangGraphInterrupt } from '@copilotkit/react-core';
import { useEffect } from 'react';

// Internal
import { InterruptReviewCard } from '@/components/interrupt-review-card';
import { useInterruptDraft } from '@/hooks/use-interrupt-draft';
import { useChatSession } from '@/providers/chat-session';
import { useInterruptFeedbackBridge } from '@/providers/interrupt-feedback-bridge';

interface InterruptPayload {
  emailId?: string;
  subject?: string;
  originalEmail?: string;
  draftResponse?: string;
  urgency?: string;
  intent?: string;
  action?: string;
}

interface EmailInterruptReviewProps {
  readonly resolve: (value: string) => void;
  readonly value: InterruptPayload;
  readonly draft: string;
  readonly onDraftChange: (value: string) => void;
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

/** Email review card wired to interrupt resume and chat feedback. */
const EmailInterruptReview = ({
  resolve,
  value,
  draft,
  onDraftChange,
}: EmailInterruptReviewProps): React.JSX.Element => {
  const { isHistoricalThread } = useChatSession();
  const { register, unregister } = useInterruptFeedbackBridge();

  useEffect(() => {
    if (isHistoricalThread) {
      return undefined;
    }

    register({
      resolve,
      canAcceptChatFeedback: true,
    });

    return unregister;
  }, [isHistoricalThread, register, resolve, unregister]);

  const intent = value.intent ?? 'unknown';
  const urgency = value.urgency ?? 'medium';

  return (
    <InterruptReviewCard
      title="Review email reply"
      subtitle={value.action}
      chatHint={
        isHistoricalThread
          ? undefined
          : 'Type your changes in the chat below to regenerate the draft.'
      }
      readOnly={isHistoricalThread}
      badges={
        <>
          <span className="interrupt-card__badge">{intent}</span>
          <span className={`interrupt-card__badge ${urgencyClass(urgency)}`}>
            {urgency}
          </span>
        </>
      }
      draftLabel="Draft reply"
      draftId="draft-editor"
      draft={draft}
      onDraftChange={onDraftChange}
      onResolve={resolve}
    >
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
    </InterruptReviewCard>
  );
};

/** Renders human-in-the-loop review for draft email replies inside the chat. */
export const EmailReviewInterrupt = (): null => {
  const { getDraft, setDraft } = useInterruptDraft();

  useLangGraphInterrupt<InterruptPayload>({
    render: ({ event, resolve }) => {
      const value = event.value;

      return (
        <EmailInterruptReview
          resolve={resolve}
          value={value}
          draft={getDraft(value.draftResponse)}
          onDraftChange={setDraft}
        />
      );
    },
  });

  return null;
};
