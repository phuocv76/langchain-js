// Internal
import type { NewsSummary } from '@/lib/news/summary';

interface NewsSummaryCardProps {
  summary: NewsSummary;
}

/** Readable card for structured AI news summaries. */
export const NewsSummaryCard = ({
  summary,
}: NewsSummaryCardProps): React.JSX.Element => {
  return (
    <article className="news-summary-card" aria-label="AI news summary">
      <header className="news-summary-card__header">
        <span className="news-summary-card__badge">AI News</span>
        <h2 className="news-summary-card__title">{summary.title}</h2>
      </header>

      <section className="news-summary-card__section">
        <h3 className="news-summary-card__label">Summary</h3>
        <p className="news-summary-card__text">{summary.summary}</p>
      </section>

      <section className="news-summary-card__section news-summary-card__section--impact">
        <h3 className="news-summary-card__label">Impact</h3>
        <p className="news-summary-card__text">{summary.impact}</p>
      </section>
    </article>
  );
};
