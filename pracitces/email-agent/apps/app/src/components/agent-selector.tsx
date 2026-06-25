// Internal
import { PanelToggleIcon } from "@/components/icons/panel-toggle-icon";
import { PRACTICE_AGENTS, type AgentId } from "@/lib/agents";

interface AgentSelectorProps {
  readonly activeAgentId: AgentId;
  readonly collapsed: boolean;
  readonly onSelectAgent: (agentId: AgentId) => void;
  readonly onToggleCollapse: () => void;
}

/** Short label for collapsed agent rail buttons. */
const agentInitial = (label: string): string =>
  label
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** Sidebar list for switching between LangChain practice agents. */
export const AgentSelector = ({
  activeAgentId,
  collapsed,
  onSelectAgent,
  onToggleCollapse,
}: AgentSelectorProps): React.JSX.Element => {
  return (
    <div
      className={`agent-selector${collapsed ? " agent-selector--collapsed" : ""}`}
    >
      <div className="agent-selector__header">
        {!collapsed ? (
          <p className="agent-selector__title">Practice agents</p>
        ) : null}
        <button
          type="button"
          className="agent-selector__toggle"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          aria-label={
            collapsed
              ? "Expand practice agents panel"
              : "Collapse practice agents panel"
          }
          title={collapsed ? "Show practice agents" : "Hide practice agents"}
        >
          <PanelToggleIcon collapsed={collapsed} />
        </button>
      </div>

      {collapsed ? (
        <ul className="agent-selector__rail" aria-label="Practice agents">
          {PRACTICE_AGENTS.map((agent) => {
            const isActive = agent.id === activeAgentId;

            return (
              <li key={agent.id}>
                <button
                  type="button"
                  className={`agent-selector__rail-item${isActive ? " agent-selector__rail-item--active" : ""}`}
                  onClick={() => onSelectAgent(agent.id)}
                  title={`${agent.label} — ${agent.description}`}
                  aria-label={agent.label}
                  aria-current={isActive ? "true" : undefined}
                >
                  {agentInitial(agent.label)}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="agent-selector__list">
          {PRACTICE_AGENTS.map((agent) => {
            const isActive = agent.id === activeAgentId;

            return (
              <li key={agent.id}>
                <button
                  type="button"
                  className={`agent-selector__item${isActive ? " agent-selector__item--active" : ""}`}
                  onClick={() => onSelectAgent(agent.id)}
                  title={agent.description}
                >
                  <span className="agent-selector__label">{agent.label}</span>
                  <span className="agent-selector__hint">
                    {agent.description}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
