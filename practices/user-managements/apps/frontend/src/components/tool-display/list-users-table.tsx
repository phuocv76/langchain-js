// Internal
import { MESSAGES } from '@/lib/constants/messages';
import type { ClientUser } from '@/lib/tool-output-parsers';

interface ListUsersTableProps {
  readonly users: ClientUser[];
}

/**
 * Formats a `created_at` timestamp (seconds or milliseconds) as a short date.
 *
 * @param createdAt - Epoch timestamp from the user record.
 * @returns Localised short date, or an em dash when unavailable.
 */
const formatJoined = (createdAt: number): string => {
  if (!Number.isFinite(createdAt) || createdAt <= 0) return '—';
  const millis = createdAt < 1e12 ? createdAt * 1000 : createdAt;
  return new Date(millis).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/** Returns the uppercase initials used for the avatar badge. */
const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

/** Directory table for list_users tool output. */
export const ListUsersTable = ({
  users,
}: ListUsersTableProps): React.JSX.Element => {
  if (users.length === 0) {
    return (
      <div className="tool-panel">
        <p className="tool-panel__title">{MESSAGES.USERS_TITLE}</p>
        <p className="tool-panel__muted">{MESSAGES.NO_USERS}</p>
      </div>
    );
  }

  return (
    <div className="tool-panel">
      <div className="tool-panel__header">
        <p className="tool-panel__title">{MESSAGES.USERS_TITLE}</p>
        <p className="tool-panel__muted">
          {MESSAGES.FOOTER_SHOWING} {users.length} {MESSAGES.FOOTER_USERS}
        </p>
      </div>
      <div className="tool-table-wrap">
        <table className="tool-table">
          <thead>
            <tr>
              <th className="tool-table__col-num">#</th>
              <th>{MESSAGES.COL_USER}</th>
              <th>{MESSAGES.COL_ROLE}</th>
              <th>{MESSAGES.COL_STATUS}</th>
              <th>{MESSAGES.JOINED}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, index) => (
              <tr key={u.id}>
                <td className="tool-table__col-num">{index + 1}</td>
                <td>
                  <div className="tool-table__user">
                    <span className="tool-table__avatar" aria-hidden="true">
                      {initials(u.name)}
                    </span>
                    <span className="tool-table__user-text">
                      <span className="tool-table__name">{u.name}</span>
                      <span className="tool-table__email">{u.email}</span>
                    </span>
                  </div>
                </td>
                <td>
                  <span className={`tool-badge tool-badge--role-${u.role}`}>
                    {u.role === 'admin'
                      ? MESSAGES.ROLE_ADMIN
                      : MESSAGES.ROLE_MEMBER}
                  </span>
                </td>
                <td>
                  <span className={`tool-badge tool-badge--status-${u.status}`}>
                    <span className="tool-badge__dot" aria-hidden="true" />
                    {u.status === 'active'
                      ? MESSAGES.STATUS_ACTIVE
                      : MESSAGES.STATUS_INACTIVE}
                  </span>
                </td>
                <td className="tool-table__joined">
                  {formatJoined(u.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
