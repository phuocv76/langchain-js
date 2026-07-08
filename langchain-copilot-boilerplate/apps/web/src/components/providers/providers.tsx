'use client';

// Libs for third party
import { CopilotKit } from '@copilotkit/react-core/v2';
import { ThemeProvider } from 'next-themes';

// Internal
import { ThemeAgent } from '@/agents/theme-agent';
import { SidebarProvider } from '@/components/layout/sidebar/sidebar-context';
import {
  AGENT_ID,
  COPILOT_PUBLIC_LICENSE_KEY,
  COPILOT_RUNTIME_URL,
} from '@/lib/config';

/**
 * Application providers.
 *
 * - `ThemeProvider` (next-themes) drives light/dark/system via a `class`.
 * - `CopilotKit` connects the UI to the agent runtime.
 * - With `publicLicenseKey` + Intelligence env on the agent, `useThreads`
 *   loads durable, user-scoped history from the Enterprise Intelligence Platform.
 * - `ThemeAgent` registers the client-side `setTheme` frontend tool.
 */
export const Providers = ({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element => (
  <ThemeProvider
    attribute="class"
    defaultTheme="system"
    enableSystem
    disableTransitionOnChange
  >
    <CopilotKit
      runtimeUrl={COPILOT_RUNTIME_URL}
      agent={AGENT_ID}
      publicLicenseKey={COPILOT_PUBLIC_LICENSE_KEY}
      // REST (multi-route) transport exposes the runtime's thread endpoints,
      // which power the history sidebar via `useThreads`. The default
      // single-endpoint transport disables them.
      useSingleEndpoint={false}
    >
      <ThemeAgent />
      <SidebarProvider>{children}</SidebarProvider>
    </CopilotKit>
  </ThemeProvider>
);
