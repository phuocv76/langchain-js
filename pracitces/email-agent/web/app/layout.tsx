import type { Metadata } from "next";

// Libs for third party
import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";

import "./globals.css";

export const metadata: Metadata = {
  title: "Email Agent",
  description: "LangGraph + CopilotKit email read and reply workflow",
};

/** Root layout wrapping the app with CopilotKit. */
const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element => (
  <html lang="en">
    <body>
      <CopilotKit runtimeUrl="/api/copilotkit" agent="emailAgent">
        {children}
      </CopilotKit>
    </body>
  </html>
);

export default RootLayout;
