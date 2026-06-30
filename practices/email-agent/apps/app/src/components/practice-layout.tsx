// Internal
import { AgentSelector } from "@/components/agent-selector";
import { AgentPage } from "@/components/practice-agent-page";
import type { AgentId } from "@/lib/agents";

interface PracticeLayoutProps {
  readonly activeAgentId: AgentId;
  readonly isAgentsPanelOpen: boolean;
  readonly onSelectAgent: (agentId: AgentId) => void;
  readonly onToggleAgentsPanel: () => void;
}

/** Two-column shell: agent picker rail and active agent chat surface. */
export const PracticeLayout = ({
  activeAgentId,
  isAgentsPanelOpen,
  onSelectAgent,
  onToggleAgentsPanel,
}: PracticeLayoutProps): React.JSX.Element => {
  return (
    <div className="practice-layout">
      <aside
        className={`practice-layout__agents${isAgentsPanelOpen ? "" : " practice-layout__agents--collapsed"}`}
        aria-label="Agent selection"
      >
        <AgentSelector
          activeAgentId={activeAgentId}
          collapsed={!isAgentsPanelOpen}
          onSelectAgent={onSelectAgent}
          onToggleCollapse={onToggleAgentsPanel}
        />
      </aside>

      <div className="practice-layout__content">
        <AgentPage agentId={activeAgentId} />
      </div>
    </div>
  );
};
