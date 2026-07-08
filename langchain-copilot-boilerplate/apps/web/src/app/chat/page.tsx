// Internal
import { AuthGate } from '@/components/auth/auth-gate';
import { ChatView } from '@/components/chat/chat-view';
import { AppHeader } from '@/components/layout/header/app-header';
import { Sidebar } from '@/components/layout/sidebar/sidebar';

/** Authenticated chat workspace. */
const ChatPage = (): React.JSX.Element => (
  <AuthGate>
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="min-h-0 flex-1">
          <ChatView />
        </main>
      </div>
    </div>
  </AuthGate>
);

export default ChatPage;
