// Libs for third party
import type { Metadata } from 'next';

// Internal
import { APP_NAME } from '@repo/shared';
import { Providers } from '@/components/providers/providers';
import './globals.css';

export const metadata: Metadata = {
  title: APP_NAME,
  description:
    'ChatGPT-style AI app built with LangChain, LangGraph, and CopilotKit.',
};

const RootLayout = ({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element => (
  <html lang="en" suppressHydrationWarning>
    <body className="min-h-screen bg-background text-foreground antialiased">
      <Providers>{children}</Providers>
    </body>
  </html>
);

export default RootLayout;
