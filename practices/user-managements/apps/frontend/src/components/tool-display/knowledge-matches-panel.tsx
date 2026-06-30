// Internal
import { MESSAGES } from '@/lib/constants/messages';

interface KnowledgeMatchesProps {
  readonly matches: { content: string; similarity?: number }[];
}

/** Renders RAG knowledge / user-info search matches. */
export const KnowledgeMatchesPanel = ({
  matches,
}: KnowledgeMatchesProps): React.JSX.Element => (
  <div className="tool-panel">
    <p className="tool-panel__title">Knowledge matches</p>
    {matches.length === 0 ? (
      <p className="tool-panel__muted">No relevant matches found.</p>
    ) : (
      <ul className="tool-list">
        {matches.map((m, i) => (
          <li key={`${i}-${m.content.slice(0, 24)}`}>
            {m.content}
            {m.similarity !== undefined ? (
              <span className="tool-panel__muted">
                {' '}
                ({Math.round(m.similarity * 100)}%)
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    )}
  </div>
);

interface PendingToolProps {
  readonly message: string;
}

/** Loading state for in-progress tools. */
export const PendingToolPanel = ({
  message,
}: PendingToolProps): React.JSX.Element => (
  <div className="tool-panel tool-panel--pending">
    <p className="tool-panel__muted">{message}</p>
  </div>
);
