"use client";

// Libs for third party
import { useState } from "react";

// Internal
import { ChatSidebar } from "./components/chat-sidebar";
import { EmailAgentChat } from "./components/email-agent-chat";
import { EmailReviewInterrupt } from "./components/email-review-interrupt";

/** ChatGPT-style shell: history sidebar + centered CopilotKit chat. */
const EmailAgentPage = (): React.JSX.Element => {
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(
    undefined,
  );
  const [chatSessionKey, setChatSessionKey] = useState(0);

  /** Starts a fresh conversation by clearing the active thread. */
  const handleNewChat = (): void => {
    setActiveThreadId(undefined);
    setChatSessionKey((key) => key + 1);
  };

  /** Loads an existing Intelligence-backed thread into the chat. */
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

export default EmailAgentPage;
