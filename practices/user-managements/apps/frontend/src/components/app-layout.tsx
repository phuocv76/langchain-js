// Internal
import { AssistantPage } from '@/components/assistant-page';
import { DashboardPage } from '@/components/dashboard/dashboard-page';
import { MESSAGES } from '@/lib/constants/messages';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
}

export type AppView = 'dashboard' | 'assistant';

interface AppLayoutProps {
  readonly user: AuthUser;
  readonly view: AppView;
  readonly onViewChange: (view: AppView) => void;
  readonly onSignOut: () => void;
}

/** Main shell with nav between dashboard and assistant. */
export const AppLayout = ({
  user,
  view,
  onViewChange,
  onSignOut,
}: AppLayoutProps): React.JSX.Element => (
  <div className="root-layout">
    <nav className="root-nav" aria-label="Main">
      <p className="root-nav__brand">{MESSAGES.APP_TITLE}</p>
      <div className="root-nav__links">
        <button
          type="button"
          className={`root-nav__link${view === 'dashboard' ? ' root-nav__link--active' : ''}`}
          onClick={() => onViewChange('dashboard')}
        >
          {MESSAGES.NAV_DASHBOARD}
        </button>
        <button
          type="button"
          className={`root-nav__link${view === 'assistant' ? ' root-nav__link--active' : ''}`}
          onClick={() => onViewChange('assistant')}
        >
          {MESSAGES.NAV_ASSISTANT}
        </button>
      </div>
      <div className="root-nav__account">
        <span className="root-nav__user">
          {user.name} ({user.role})
        </span>
        <button type="button" className="root-nav__signout" onClick={onSignOut}>
          {MESSAGES.SIGN_OUT}
        </button>
      </div>
    </nav>
    <div className="root-content">
      {view === 'dashboard' ? <DashboardPage user={user} /> : <AssistantPage />}
    </div>
  </div>
);
