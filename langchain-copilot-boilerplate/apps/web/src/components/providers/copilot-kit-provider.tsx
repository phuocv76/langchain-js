// Libs for third party
import { CopilotKit, useCopilotKit } from '@copilotkit/react-core/v2';
import { useEffect } from 'react';

// Internal
import { useAuth } from '@/components/auth/auth-provider';
import { AGENT_ID, COPILOT_RUNTIME_URL } from '@/lib/config';

/**
 * Keeps the runtime `Authorization` header in sync with Firebase token
 * rotation. `setHeaders` overwrites, so spread the current headers to keep
 * entries set elsewhere.
 */
const AuthTokenSync = ({ idToken }: { idToken: string }): null => {
  const { copilotkit } = useCopilotKit();

  useEffect(() => {
    copilotkit.setHeaders({
      ...copilotkit.headers,
      Authorization: `Bearer ${idToken}`,
    });
  }, [copilotkit, idToken]);

  return null;
};

/**
 * Mounts CopilotKit once the signed-in user's ID token is available. The
 * browser calls the agent runtime directly — every request carries the
 * Firebase ID token, which the agent verifies before reaching LangGraph.
 */
export const CopilotKitProvider = ({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element => {
  const { user, idToken } = useAuth();

  if (!user || !idToken) {
    return <>{children}</>;
  }

  return (
    <CopilotKit
      runtimeUrl={COPILOT_RUNTIME_URL}
      agent={AGENT_ID}
      headers={{ Authorization: `Bearer ${idToken}` }}
    >
      <AuthTokenSync idToken={idToken} />
      {children}
    </CopilotKit>
  );
};
