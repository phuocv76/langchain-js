// Internal
import { MESSAGES } from '@/lib/constants/messages';
import type { ClientUser } from '@/lib/tool-output-parsers';

interface ListUsersTableProps {
  readonly users: ClientUser[];
}

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
              <th>{MESSAGES.COL_USER}</th>
              <th>{MESSAGES.COL_ROLE}</th>
              <th>{MESSAGES.COL_STATUS}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <p className="tool-table__name">{u.name}</p>
                  <p className="tool-table__email">{u.email}</p>
                </td>
                <td>
                  {u.role === 'admin'
                    ? MESSAGES.ROLE_ADMIN
                    : MESSAGES.ROLE_MEMBER}
                </td>
                <td>
                  {u.status === 'active'
                    ? MESSAGES.STATUS_ACTIVE
                    : MESSAGES.STATUS_INACTIVE}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
