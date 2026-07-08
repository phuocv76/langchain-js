'use client';

// Libs for third party
import { CopilotKit } from '@copilotkit/react-core/v2';

// Internal
import { ThemeAgent } from '@/agents/theme-agent';
import { useAuth } from '@/components/auth/auth-provider';
import { SidebarProvider } from '@/components/layout/sidebar/sidebar-context';
import {
  AGENT_ID,
  COPILOT_PUBLIC_LICENSE_KEY,
  COPILOT_RUNTIME_URL,
} from '@/lib/config';

/** Wraps CopilotKit so runtime requests include the signed-in user identity. */
export const CopilotKitProvider = ({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element => {
  const { user } = useAuth();

  return (
    <CopilotKit
      runtimeUrl={COPILOT_RUNTIME_URL}
      agent={AGENT_ID}
      publicLicenseKey={COPILOT_PUBLIC_LICENSE_KEY}
      useSingleEndpoint={false}
      headers={(): Record<string, string> => {
        if (!user) {
          return {};
        }

        return {
          'x-user-id': user.id,
          'x-user-name': user.name,
        };
      }}
    >
      <ThemeAgent />
      <SidebarProvider>{children}</SidebarProvider>
    </CopilotKit>
  );
};
