// Libs for third party
import { tool } from '@langchain/core/tools';
import type { RunnableConfig } from '@langchain/core/runnables';
import { z } from 'zod';

// Internal
import { TOOL_MESSAGES } from '../../constants/messages.js';
import {
  apiFetch,
  parseApiJson,
  readSessionContext,
} from '../../lib/api-client.js';
interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  status: 'active' | 'inactive';
  date_of_birth: string | null;
  bio: string | null;
}

/** Loads the signed-in user's profile via REST. */
export const getMyProfileTool = tool(
  async (_input, config: RunnableConfig) => {
    const session = readSessionContext(config);
    const response = await apiFetch(config, '/api/auth/me');
    const body = await parseApiJson<{ user: UserResponse | null }>(response);
    return { profile: body.user, requestedAs: session.userId };
  },
  {
    name: 'get_my_profile',
    description: TOOL_MESSAGES.GET_MY_PROFILE,
    schema: z.object({}),
  },
);

/** Lists all directory users (admin only). */
export const listUsersTool = tool(
  async (_input, config: RunnableConfig) => {
    const session = readSessionContext(config);
    if (session.userRole !== 'admin') {
      return { ok: false as const, error: 'Admin only.' };
    }
    const response = await apiFetch(config, '/api/users');
    const body = await parseApiJson<{ users: UserResponse[] }>(response);
    return { users: body.users };
  },
  {
    name: 'list_users',
    description: TOOL_MESSAGES.LIST_USERS,
    schema: z.object({}),
  },
);

/** Finds a user by email address. */
export const findUserByEmailTool = tool(
  async ({ email }, config: RunnableConfig) => {
    const normalized = email.trim().toLowerCase();
    const response = await apiFetch(
      config,
      `/api/users/by-email/${encodeURIComponent(normalized)}`,
    );

    if (response.status === 404) {
      return { notFound: true as const, emailSearched: normalized };
    }

    const body = await parseApiJson<{ user: UserResponse }>(response);
    return { user: body.user };
  },
  {
    name: 'find_user_by_email',
    description: TOOL_MESSAGES.FIND_USER_BY_EMAIL,
    schema: z.object({
      email: z.string().describe('Email address to look up'),
    }),
  },
);

/** Fetches one user by UUID (admin only). */
export const getUserTool = tool(
  async ({ id }, config: RunnableConfig) => {
    const session = readSessionContext(config);
    if (session.userRole !== 'admin') {
      return { ok: false as const, error: 'Admin only.' };
    }
    const response = await apiFetch(
      config,
      `/api/users/${encodeURIComponent(id)}`,
    );

    if (response.status === 404) {
      return { notFound: true as const, id };
    }

    const body = await parseApiJson<{ user: UserResponse }>(response);
    return { user: body.user };
  },
  {
    name: 'get_user',
    description: TOOL_MESSAGES.GET_USER,
    schema: z.object({
      id: z.string().describe('User id (UUID)'),
    }),
  },
);

/** Member-facing read tools available to all authenticated users. */
export const memberReadTools = [getMyProfileTool, findUserByEmailTool] as const;

/** Admin read tools (includes member tools + directory listing). */
export const adminReadTools = [
  ...memberReadTools,
  listUsersTool,
  getUserTool,
] as const;
