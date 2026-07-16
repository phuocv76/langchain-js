// Libs for third party
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Read-only tools over the existing product REST API (space-api).
 *
 * Definitions carry only the schema the model sees. Execution is intercepted
 * by the workspace-tools middleware, which injects the verified acting
 * identity from graph state — the model never chooses whose data is read
 * (see services/workspace-api.ts).
 */

const email = z
  .string()
  .optional()
  .describe(
    "Employee email. Omit to use the signed-in user's own email " +
      '(e.g. for "my projects", "my time off").',
  );

/** Placeholder executor — the middleware replaces the call entirely. */
const notWired = async (): Promise<string> => {
  throw new Error('Workspace tools must run through workspaceToolsMiddleware');
};

export const workspaceTools = [
  tool(notWired, {
    name: 'search_employees',
    description:
      'Search the employee directory by name or keyword. Returns a compact list of matching employees.',
    schema: z.object({
      query: z.string().optional().describe('Name or keyword to search for.'),
      limit: z.number().int().min(1).max(30).optional().describe('Max results (default 10).'),
    }),
  }),
  tool(notWired, {
    name: 'get_employee_profile',
    description:
      "Get one employee's profile: role, working status, contact, and general info.",
    schema: z.object({ email }),
  }),
  tool(notWired, {
    name: 'get_employee_projects',
    description: 'List the projects an employee participates in.',
    schema: z.object({ email }),
  }),
  tool(notWired, {
    name: 'get_employee_time_off',
    description:
      "Get an employee's time-off records, optionally for a specific year.",
    schema: z.object({
      email,
      year: z.number().int().optional().describe('Four-digit year, e.g. 2026.'),
    }),
  }),
  tool(notWired, {
    name: 'list_projects',
    description: 'List workspace projects, optionally filtered by a search query.',
    schema: z.object({
      query: z.string().optional().describe('Project name or keyword.'),
      limit: z.number().int().min(1).max(30).optional().describe('Max results (default 10).'),
    }),
  }),
  tool(notWired, {
    name: 'get_project_members',
    description: 'List the members of a project by its project id.',
    schema: z.object({
      projectId: z.string().describe('Project id from list_projects.'),
    }),
  }),
  tool(notWired, {
    name: 'get_workspace_stats',
    description: 'Get overall workspace statistics (employees, projects, activity).',
    schema: z.object({}),
  }),
];

const workspaceToolNames = new Set<string>(workspaceTools.map((t) => t.name));

export const isWorkspaceTool = (name: string): boolean =>
  workspaceToolNames.has(name);
