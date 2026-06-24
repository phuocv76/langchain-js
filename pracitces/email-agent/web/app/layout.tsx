import type { Metadata } from "next";

// Libs for third party
import { CopilotKit } from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";

import "./globals.css";

const AGENT_ID = "emailAgent";

export const metadata: Metadata = {
  title: "Email Agent",
  description: "LangGraph + CopilotKit email read and reply workflow",
};

/** Root layout wrapping the app with CopilotKit v2. */
const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element => (
  <html lang="en" className="dark">
    <body>
      <CopilotKit
        runtimeUrl="/api/copilotkit"
        agent={AGENT_ID}
        useSingleEndpoint={false}
        showDevConsole={false}
      >
        {children}
      </CopilotKit>
    </body>
  </html>
);

export default RootLayout;
