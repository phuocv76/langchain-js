// Libs for third party
import { useLangGraphInterrupt } from "@copilotkit/react-core";

// Internal
import { InterruptReviewCard } from "@/components/interrupt-review-card";
import { useInterruptDraft } from "@/hooks/use-interrupt-draft";

interface WarrantyInterruptPayload {
  product?: string;
  isUnderWarranty?: boolean;
  estimatedCost?: number;
  reasoning?: string;
  recommendedAction?: string;
  draftResponse?: string;
  action?: string;
}

/** Renders human-in-the-loop approval for high-risk warranty outcomes. */
export const WarrantyReviewInterrupt = (): null => {
  const { getDraft, setDraft } = useInterruptDraft();

  useLangGraphInterrupt<WarrantyInterruptPayload>({
    enabled: ({ eventValue }) =>
      Boolean(eventValue?.draftResponse ?? eventValue?.recommendedAction),
    render: ({ event, resolve }) => {
      const value = event.value;
      const draft = getDraft(value.draftResponse);

      return (
        <InterruptReviewCard
          title="Warranty approval"
          subtitle={value.action}
          badges={
            <>
              <span className="interrupt-card__badge">
                {value.product ?? "product"}
              </span>
              <span
                className={`interrupt-card__badge ${value.isUnderWarranty ? "interrupt-card__badge--low" : "interrupt-card__badge--high"}`}
              >
                {value.isUnderWarranty ? "in warranty" : "out of warranty"}
              </span>
            </>
          }
          draftLabel="Customer response"
          draftId="warranty-draft-editor"
          draft={draft}
          onDraftChange={setDraft}
          onResolve={resolve}
        >
          {value.estimatedCost !== undefined ? (
            <dl className="interrupt-card__meta">
              <dt>Estimated cost</dt>
              <dd>${value.estimatedCost.toFixed(2)}</dd>
            </dl>
          ) : null}

          {value.reasoning ? (
            <details className="interrupt-card__details" open>
              <summary>Reasoning</summary>
              <pre className="interrupt-card__panel">{value.reasoning}</pre>
            </details>
          ) : null}

          {value.recommendedAction ? (
            <dl className="interrupt-card__meta">
              <dt>Recommended action</dt>
              <dd>{value.recommendedAction}</dd>
            </dl>
          ) : null}
        </InterruptReviewCard>
      );
    },
  });

  return null;
};
