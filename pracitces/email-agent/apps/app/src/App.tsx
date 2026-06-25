import { CopilotKit } from "@copilotkit/react-core/v2";
import { useState } from "react";

import { ChatSidebar } from "@/components/chat-sidebar";
import { EmailAgentChat } from "@/components/email-agent-chat";
import { EmailReviewInterrupt } from "@/components/email-review-interrupt";

const AGENT_ID = "emailAgent";
const RUNTIME_URL = "/api/copilotkit";

/** ChatGPT-style shell: history sidebar + centered CopilotKit chat. */
const EmailAgentPage = (): React.JSX.Element => {
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(
    undefined,
  );
  const [chatSessionKey, setChatSessionKey] = useState(0);

  const handleNewChat = (): void => {
    setActiveThreadId(undefined);
    setChatSessionKey((key) => key + 1);
  };

  const handleSelectThread = (threadId: string): void => {
    setActiveThreadId(threadId);
  };

  return (
    <div className="app-shell">
      <ChatSidebar
        activeThreadId={activeThreadId}
        onNewChat={handleNewChat}
        onSelectThread={handleSelectThread}
      />

      <main className="chat-main">
        <header className="chat-main__header">
          <h1>Email Agent</h1>
        </header>

        <div className="chat-main__surface">
          <EmailAgentChat
            sessionKey={String(chatSessionKey)}
            threadId={activeThreadId}
          />
        </div>

        <EmailReviewInterrupt />
      </main>
    </div>
  );
};

export default function App(): React.JSX.Element {
  return (
    <CopilotKit
      runtimeUrl={RUNTIME_URL}
      agent={AGENT_ID}
      useSingleEndpoint={false}
      showDevConsole={false}
    >
      <EmailAgentPage />
    </CopilotKit>
  );
}
