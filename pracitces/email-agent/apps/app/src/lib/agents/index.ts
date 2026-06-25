export type AgentId = 'emailAgent' | 'newsAgent' | 'warrantyAgent';

export interface AgentDefinition {
  readonly id: AgentId;
  readonly label: string;
  readonly description: string;
  readonly welcomeMessage: string;
  readonly placeholder: string;
}

export const PRACTICE_AGENTS: readonly AgentDefinition[] = [
  {
    id: 'emailAgent',
    label: 'Email Agent',
    description: 'Read Gmail, classify, draft replies with human review.',
    welcomeMessage: 'Where should we start?',
    placeholder: 'Ask about an email workflow',
  },
  {
    id: 'newsAgent',
    label: 'AI News Summarizer',
    description: 'Search recent AI news and return structured summaries.',
    welcomeMessage: 'Ask for today’s AI news or a topic to summarize.',
    placeholder: 'Find today’s AI news',
  },
  {
    id: 'warrantyAgent',
    label: 'Warranty Assistant',
    description: 'Multi-agent warranty support with RAG and human approval.',
    welcomeMessage: 'Describe your product issue and purchase timing.',
    placeholder: 'My washing machine stopped after 18 months…',
  },
] as const;

/** Returns agent metadata for a CopilotKit graph id. */
export const getAgent = (agentId: AgentId): AgentDefinition =>
  PRACTICE_AGENTS.find((agent) => agent.id === agentId) ?? PRACTICE_AGENTS[0]!;
