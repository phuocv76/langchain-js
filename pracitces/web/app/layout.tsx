import type { Metadata } from "next";
import "./globals.css";
import "@copilotkit/react-ui/styles.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Email Agent",
  description: "LangGraph email agent with CopilotKit human-in-the-loop review.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
