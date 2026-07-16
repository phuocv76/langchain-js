'use client';

// Internal
import { AuthProvider } from '@/components/auth/auth-provider';
import { CopilotKitProvider } from '@/components/providers/copilot-kit-provider';
import { PreviewPanelProvider } from '@/components/preview/preview-panel-context';

/** Client provider stack: Firebase auth session, CopilotKit, preview panel. */
export const Providers = ({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element => (
  <AuthProvider>
    <CopilotKitProvider>
      <PreviewPanelProvider>{children}</PreviewPanelProvider>
    </CopilotKitProvider>
  </AuthProvider>
);
