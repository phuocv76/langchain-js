// Libs for third party
import { CopilotKit } from '@copilotkit/react-core/v2';

// Internal
import { AGENT_ID, COPILOT_RUNTIME_URL, USER_API_URL } from '@/lib/constants';

interface AuthUser {
  id: string;
  name: string;
  role: 'admin' | 'member';
}

interface AppShellProps {
  readonly user: AuthUser;
  readonly children: React.ReactNode;
}

/** Wraps chat in CopilotKit with session context for LangGraph configurable. */
export const AppShell = ({
  user,
  children,
}: AppShellProps): React.JSX.Element => {
  return (
    <CopilotKit
      runtimeUrl={COPILOT_RUNTIME_URL}
      agent={AGENT_ID}
      properties={{
        userId: user.id,
        userRole: user.role,
        userName: user.name,
        apiBaseUrl: USER_API_URL,
      }}
    >
      {children}
    </CopilotKit>
  );
};
