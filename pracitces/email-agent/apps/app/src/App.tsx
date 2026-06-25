// Internal
import { PracticeLayout } from "@/components/practice-layout";
import { useAgentSelection } from "@/hooks/use-practice-agent-selection";
import { CopilotProvider } from "@/providers/copilot-provider";

/** Root application shell for LangChain practice agents. */
export default function App(): React.JSX.Element {
  const {
    activeAgentId,
    agentSessionKey,
    isAgentsPanelOpen,
    selectAgent,
    toggleAgentsPanel,
  } = useAgentSelection();

  return (
    <CopilotProvider agentId={activeAgentId} sessionKey={agentSessionKey}>
      <PracticeLayout
        activeAgentId={activeAgentId}
        isAgentsPanelOpen={isAgentsPanelOpen}
        onSelectAgent={selectAgent}
        onToggleAgentsPanel={toggleAgentsPanel}
      />
    </CopilotProvider>
  );
}
