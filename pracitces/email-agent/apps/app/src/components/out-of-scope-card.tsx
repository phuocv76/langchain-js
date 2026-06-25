// Internal
import { isGuardrailReply } from "@/lib/guardrails";

interface OutOfScopeCardProps {
  message: string;
}

/** Highlights guardrail replies so they are not mistaken for news summaries. */
export const OutOfScopeCard = ({
  message,
}: OutOfScopeCardProps): React.JSX.Element => {
  return (
    <article className="out-of-scope-card" aria-label="Out of scope message">
      <p className="out-of-scope-card__text">{message}</p>
    </article>
  );
};

/** Returns an out-of-scope card when content is any agent guardrail reply. */
export const renderGuardrailCard = (
  content: string | undefined,
): React.JSX.Element | null => {
  if (!isGuardrailReply(content)) {
    return null;
  }

  return <OutOfScopeCard message={content!.trim()} />;
};
