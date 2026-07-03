// Internal
import { resolveInterrupt } from '@/lib/interrupts/actions';

interface InterruptReviewCardProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly preview: React.ReactNode;
  readonly onResolve: (value: string) => void;
}

/** Shared shell for mutation approval interrupts. */
export const InterruptReviewCard = ({
  title,
  subtitle,
  preview,
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
      </header>

      <div className="interrupt-card__preview">{preview}</div>

      <footer className="interrupt-card__actions">
        <button
          type="button"
          className="interrupt-card__btn interrupt-card__btn--primary"
          onClick={() => resolveInterrupt(onResolve, 'approve')}
        >
          Approve
        </button>
        <button
          type="button"
          className="interrupt-card__btn interrupt-card__btn--danger"
          onClick={() => resolveInterrupt(onResolve, 'reject')}
        >
          Reject
        </button>
      </footer>
    </div>
  );
};
