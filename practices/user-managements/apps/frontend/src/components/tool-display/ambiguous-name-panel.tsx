// Internal
import { MESSAGES } from '@/lib/constants/messages';
import type { ClientUser } from '@/lib/tool-output-parsers';

interface AmbiguousNamePanelProps {
  readonly matches: ClientUser[];
  readonly message: string;
  readonly hint: string;
}

/** Panel when multiple users share a display name. */
export const AmbiguousNamePanel = ({
  matches,
  message,
  hint,
}: AmbiguousNamePanelProps): React.JSX.Element => (
  <div className="tool-panel tool-panel--warn">
    <p className="tool-panel__title">{MESSAGES.DUPLICATE_NAME_TITLE}</p>
    <p className="tool-panel__muted">{message}</p>
    <p className="tool-panel__muted">{hint}</p>
    <ul className="tool-list">
      {matches.map((u) => (
        <li key={u.id}>
          <strong>{u.name}</strong> — {u.email}
        </li>
      ))}
    </ul>
  </div>
);
