// Internal
import { UserDirectory } from '@/components/dashboard/user-directory';
import { MESSAGES } from '@/lib/constants/messages';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
}

interface DashboardPageProps {
  readonly user: AuthUser;
}

/** REST-backed user directory dashboard. */
export const DashboardPage = ({
  user,
}: DashboardPageProps): React.JSX.Element => (
  <div className="dashboard">
    <header className="dashboard__header">
      <h1>{MESSAGES.APP_TITLE}</h1>
      <p className="dashboard__subtitle">
        Signed in as {user.name} ({user.role})
      </p>
    </header>
    <UserDirectory isAdmin={user.role === 'admin'} />
  </div>
);
