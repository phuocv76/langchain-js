// Internal
import { AmbiguousNamePanel } from '@/components/tool-display/ambiguous-name-panel';
import { KnowledgeMatchesPanel } from '@/components/tool-display/knowledge-matches-panel';
import { ListUsersTable } from '@/components/tool-display/list-users-table';
import {
  UserResultCard,
  type UserCardVariant,
} from '@/components/tool-display/user-result-card';
import { MESSAGES } from '@/lib/constants/messages';
import {
  parseAmbiguousDuplicateOutput,
  parseFindUserOutput,
  parseGetMyProfileOutput,
  parseKnowledgeMatches,
  parseListUsersOutput,
  parseOkUserOutput,
} from '@/lib/tool-output-parsers';
import type { ExtractedToolResult } from '@/lib/tool-results-from-state';

const TOOL_CARD_VARIANT: Record<string, UserCardVariant> = {
  create_user: 'invited',
  update_user: 'updated',
  update_my_profile: 'profile-updated',
  get_my_profile: 'profile-loaded',
};

const renderToolResult = (result: ExtractedToolResult): React.ReactNode => {
  const { name, output } = result;

  const ambiguous = parseAmbiguousDuplicateOutput(output);
  if (ambiguous) {
    return (
      <AmbiguousNamePanel
        key={name}
        matches={ambiguous.matches}
        message={ambiguous.message}
        hint={ambiguous.hint}
      />
    );
  }

  if (name === 'list_users') {
    const users = parseListUsersOutput(output);
    if (users) return <ListUsersTable key={name} users={users} />;
  }

  if (name === 'find_user_by_email') {
    const user = parseFindUserOutput(output);
    if (user) {
      return <UserResultCard key={name} user={user} variant="profile-loaded" />;
    }
  }

  if (name === 'get_knowledge' || name === 'query_user_info') {
    const matches = parseKnowledgeMatches(output);
    if (matches) return <KnowledgeMatchesPanel key={name} matches={matches} />;
  }

  if (name === 'add_knowledge' && output && typeof output === 'object') {
    const o = output as Record<string, unknown>;
    if (o.ok === true) {
      return (
        <div key={name} className="tool-panel">
          <p className="tool-panel__muted">{MESSAGES.ADD_KNOWLEDGE_DONE}</p>
        </div>
      );
    }
  }

  const variant = TOOL_CARD_VARIANT[name];
  if (variant) {
    const parser =
      name === 'get_my_profile' ? parseGetMyProfileOutput : parseOkUserOutput;
    const user = parser(output);
    if (user)
      return <UserResultCard key={name} user={user} variant={variant} />;
  }

  if (output && typeof output === 'object') {
    const o = output as Record<string, unknown>;
    if (o.cancelled === true) {
      return (
        <div key={name} className="tool-panel">
          <p className="tool-panel__muted">Action cancelled.</p>
        </div>
      );
    }
  }

  return null;
};

interface ToolResultsPanelProps {
  readonly results: ExtractedToolResult[];
}

/** Renders rich UI for all tool results in an assistant turn. */
export const ToolResultsPanel = ({
  results,
}: ToolResultsPanelProps): React.JSX.Element | null => {
  if (results.length === 0) return null;

  const nodes = results.map(renderToolResult).filter(Boolean);
  if (nodes.length === 0) return null;

  return <div className="tool-results">{nodes}</div>;
};
