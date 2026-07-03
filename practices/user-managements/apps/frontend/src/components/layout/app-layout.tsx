// Internal
import { AssistantPage } from '@/components/chat/assistant-page';
import { MESSAGES } from '@/lib/constants/messages';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
}

interface AppLayoutProps {
  readonly user: AuthUser;
  readonly onSignOut: () => void;
}

/** Main shell — chat assistant only. */
export const AppLayout = ({
  user,
  onSignOut,
}: AppLayoutProps): React.JSX.Element => (
  <div className="root-layout">
    <nav className="root-nav" aria-label="Main">
      <p className="root-nav__brand">{MESSAGES.APP_TITLE}</p>
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
      <AssistantPage />
    </div>
  </div>
);
