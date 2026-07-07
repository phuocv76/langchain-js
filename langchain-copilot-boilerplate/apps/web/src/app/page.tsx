// Internal
import { ChatView } from '@/components/chat/chat-view';
import { AppHeader } from '@/components/layout/app-header';
import { Sidebar } from '@/components/layout/sidebar';

/** Home page — ChatGPT-style layout with a history sidebar. */
const HomePage = (): React.JSX.Element => (
  <div className="flex h-screen">
    <Sidebar />
    <div className="flex min-w-0 flex-1 flex-col">
      <AppHeader />
      <main className="min-h-0 flex-1">
        <ChatView />
      </main>
    </div>
  </div>
);

export default HomePage;
