import { useAuth } from '@/components/auth/auth-provider';
import { LoginScreen } from '@/components/auth/login-screen';
import { ChatView } from '@/components/chat/chat-view';

/** Single-route app: login gate, then the full-window chat. */
export const App = (): React.JSX.Element => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <ChatView />;
};
