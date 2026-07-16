// Internal
import {
  type ActingIdentity,
  ApiClientError,
  apiRequest,
  isApiConfigured,
} from '@agent/services/api-client.js';

/** Bound tool output so one verbose endpoint cannot flood the prompt. */
const MAX_RESULT_CHARS = 6_000;

const API_PREFIX = '/api/v1';

const asText = (value: unknown): string => {
  const text = JSON.stringify(value);
  return text.length > MAX_RESULT_CHARS
    ? `${text.slice(0, MAX_RESULT_CHARS)}… (truncated)`
    : text;
};

const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const num = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const employeePath = (identity: ActingIdentity, args: Record<string, unknown>): string =>
  `${API_PREFIX}/employees/${encodeURIComponent(str(args.email) ?? identity.email)}`;

/**
 * Executes one read-only workspace tool against the product REST API.
 *
 * The acting identity always comes from the verified trusted context; a
 * model-supplied `email` argument only selects WHICH employee to read —
 * the API still authorizes the request as the signed-in user.
 *
 * @returns Tool output for the model; API failures become readable messages
 *   instead of crashing the run.
 */
export const executeWorkspaceTool = async (
  name: string,
  args: Record<string, unknown>,
  identity: ActingIdentity,
): Promise<string> => {
  if (!isApiConfigured()) {
    return 'The workspace API is not configured on this deployment, so workspace data is unavailable.';
  }

  try {
    switch (name) {
      case 'search_employees':
        return asText(
          await apiRequest(`${API_PREFIX}/employees`, {
            identity,
            query: {
              simple: 'true',
              limit: String(num(args.limit) ?? 10),
              ...(str(args.query) ? { query: str(args.query)! } : {}),
            },
          }),
        );
      case 'get_employee_profile':
        return asText(
          await apiRequest(`${employeePath(identity, args)}/profile`, { identity }),
        );
      case 'get_employee_projects':
        return asText(
          await apiRequest(`${employeePath(identity, args)}/projects`, { identity }),
        );
      case 'get_employee_time_off': {
        const year = num(args.year);
        const path = `${employeePath(identity, args)}/time-offs${year ? `/${year}` : ''}`;
        return asText(await apiRequest(path, { identity }));
      }
      case 'list_projects':
        return asText(
          await apiRequest(`${API_PREFIX}/projects`, {
            identity,
            query: {
              limit: String(num(args.limit) ?? 10),
              ...(str(args.query) ? { query: str(args.query)! } : {}),
            },
          }),
        );
      case 'get_project_members': {
        const projectId = str(args.projectId);
        if (!projectId) return 'A projectId argument is required.';
        return asText(
          await apiRequest(
            `${API_PREFIX}/projects/${encodeURIComponent(projectId)}/members`,
            { identity },
          ),
        );
      }
      case 'get_workspace_stats':
        return asText(await apiRequest(`${API_PREFIX}/stats`, { identity }));
      default:
        return `Unknown workspace tool: ${name}`;
    }
  } catch (error) {
    if (error instanceof ApiClientError) {
      return `Workspace API request failed${error.status ? ` (${error.status})` : ''}: ${error.message}`;
    }
    throw error;
  }
};
