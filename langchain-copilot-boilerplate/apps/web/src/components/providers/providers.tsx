'use client';

// Libs for third party
import { ThemeProvider } from 'next-themes';

// Internal
import { AuthProvider } from '@/components/auth/auth-provider';
import { CopilotKitProvider } from '@/components/providers/copilot-kit-provider';

/**
 * Application providers.
 *
 * - `ThemeProvider` (next-themes) drives light/dark/system via a `class`.
 * - `AuthProvider` manages the email sign-in session.
 * - `CopilotKitProvider` connects the UI to the authenticated server proxy.
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
    <AuthProvider>
      <CopilotKitProvider>{children}</CopilotKitProvider>
    </AuthProvider>
  </ThemeProvider>
);
