"use client";

import { CopilotKit } from "@copilotkit/react-core";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent="emailAgent">
      {children}
    </CopilotKit>
  );
}
