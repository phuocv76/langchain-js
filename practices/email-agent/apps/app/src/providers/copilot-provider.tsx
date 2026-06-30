// Libs for third party
import { CopilotKit } from "@copilotkit/react-core/v2";

// Internal
import { COPILOT_RUNTIME_URL } from "@/lib/constants";
import type { AgentId } from "@/lib/agents";

interface CopilotProviderProps {
  readonly agentId: AgentId;
  readonly sessionKey: number;
  readonly children: React.ReactNode;
}

/** Wraps the app in a CopilotKit runtime scoped to one practice agent. */
export const CopilotProvider = ({
  agentId,
  sessionKey,
  children,
}: CopilotProviderProps): React.JSX.Element => {
  return (
    <CopilotKit
      key={`${agentId}-${sessionKey}`}
      runtimeUrl={COPILOT_RUNTIME_URL}
      agent={agentId}
      useSingleEndpoint={false}
      showDevConsole={false}
    >
      {children}
    </CopilotKit>
  );
};
