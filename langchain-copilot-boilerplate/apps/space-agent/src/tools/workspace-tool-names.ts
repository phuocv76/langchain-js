/**
 * Names of the read-only workspace tools — the contract between this
 * product's tool definitions and its frontend preview renderers. The
 * frontend (langchain-copilot-web repo) vendors these values in
 * `src/lib/agent-contracts.ts`; update both when a tool name changes.
 */
export const WORKSPACE_TOOL_NAMES = {
  searchEmployees: 'search_employees',
  employeeProfile: 'get_employee_profile',
  employeeProjects: 'get_employee_projects',
  employeeTimeOff: 'get_employee_time_off',
  listProjects: 'list_projects',
  projectMembers: 'get_project_members',
  workspaceStats: 'get_workspace_stats',
} as const;

export type WorkspaceToolName =
  (typeof WORKSPACE_TOOL_NAMES)[keyof typeof WORKSPACE_TOOL_NAMES];
