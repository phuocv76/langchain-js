// Internal
import { resolveInterrupt } from "@/lib/interrupts/actions";

interface InterruptReviewCardProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly badges: React.ReactNode;
  readonly children: React.ReactNode;
  readonly draftLabel: string;
  readonly draftId: string;
  readonly draft: string;
  readonly onDraftChange: (value: string) => void;
  readonly onResolve: (value: string) => void;
}

/** Shared shell for human-in-the-loop draft review interrupts. */
export const InterruptReviewCard = ({
  title,
  subtitle,
  badges,
  children,
  draftLabel,
  draftId,
  draft,
  onDraftChange,
  onResolve,
}: InterruptReviewCardProps): React.JSX.Element => {
  return (
    <div className="interrupt-card">
      <header className="interrupt-card__header">
        <div>
          <h3 className="interrupt-card__title">{title}</h3>
          {subtitle ? (
            <p className="interrupt-card__subtitle">{subtitle}</p>
          ) : null}
        </div>
        <div className="interrupt-card__badges">{badges}</div>
      </header>

      {children}

      <label className="interrupt-card__label" htmlFor={draftId}>
        {draftLabel}
      </label>
      <textarea
        id={draftId}
        className="interrupt-card__panel interrupt-card__textarea"
        rows={8}
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
      />

      <footer className="interrupt-card__actions">
        <button
          type="button"
          className="interrupt-card__btn interrupt-card__btn--primary"
          onClick={() => resolveInterrupt(onResolve, "approve")}
        >
          Approve
        </button>
        <button
          type="button"
          className="interrupt-card__btn interrupt-card__btn--secondary"
          onClick={() => resolveInterrupt(onResolve, "edit", draft)}
        >
          Send edited
        </button>
        <button
          type="button"
          className="interrupt-card__btn interrupt-card__btn--danger"
          onClick={() => resolveInterrupt(onResolve, "reject")}
        >
          Reject
        </button>
      </footer>
    </div>
  );
};
