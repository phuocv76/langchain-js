'use client';

// Libs for third party
import { CopilotKit } from '@copilotkit/react-core/v2';

// Internal
import { ThemeAgent } from '@/agents/theme-agent';
import { UserProfileAgentState } from '@/agents/user-profile-agent-state';
import { useAuth } from '@/components/auth/auth-provider';
import { SidebarProvider } from '@/components/layout/sidebar/sidebar-context';
import {
  AGENT_ID,
  COPILOT_PUBLIC_LICENSE_KEY,
  COPILOT_RUNTIME_URL,
} from '@/lib/config';

/** Mounts CopilotKit only after the server-verified user session is available. */
export const CopilotKitProvider = ({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element => {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) {
    return <>{children}</>;
  }

  return (
    <CopilotKit
      runtimeUrl={COPILOT_RUNTIME_URL}
      agent={AGENT_ID}
      publicLicenseKey={COPILOT_PUBLIC_LICENSE_KEY}
      useSingleEndpoint={false}
    >
      <UserProfileAgentState />
      <ThemeAgent />
      <SidebarProvider>{children}</SidebarProvider>
    </CopilotKit>
  );
};
