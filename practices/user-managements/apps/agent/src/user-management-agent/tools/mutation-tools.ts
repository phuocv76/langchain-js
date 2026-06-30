// Libs for third party
import { tool } from '@langchain/core/tools';
import type { RunnableConfig } from '@langchain/core/runnables';
import { z } from 'zod';

// Internal
import { CONFIRM_MESSAGES, TOOL_MESSAGES } from '../../constants/messages.js';
import {
  apiFetch,
  parseApiJson,
  readSessionContext,
} from '../../lib/api-client.js';
import { userLatestTextIdentifiesDirectoryRecord } from '../../lib/display-name-match.js';
import { sanitizeUserUpdateToolInput } from '../../lib/profile-patch.js';
import {
  createUserToolInputSchema,
  deleteUserToolInputSchema,
  updateMyProfileToolInputSchema,
  updateUserToolInputSchema,
  userEmailSchema,
} from '../../lib/schemas.js';
import {
  buildCreateUserPreview,
  buildDeleteUserPreview,
  buildUserUpdatePreview,
} from '../../lib/user-update-preview.js';
import { confirmMutation } from '../nodes/human-review.js';

import type { User } from '../../domain/user.js';

const INVALID_EMAIL =
  'invalid-format: Invalid email address. Please use a valid format like name@example.com.';
const requireAdminRole = (config: RunnableConfig): void => {
  const session = readSessionContext(config);
  if (session.userRole !== 'admin') {
    throw new Error('Only admins can perform this action.');
  }
};

/** Loads a user by id via REST. */
const fetchUserById = async (
  config: RunnableConfig,
  id: string,
): Promise<User | null> => {
  const response = await apiFetch(
    config,
    `/api/users/${encodeURIComponent(id)}`,
  );
  if (response.status === 404) return null;
  const body = await parseApiJson<{ user: User }>(response);
  return body.user;
};

/** Checks duplicate display names unless latest text disambiguates. */
const checkDuplicateDisplayName = async (
  config: RunnableConfig,
  target: User,
  latestText: string,
): Promise<{ ambiguous: true; matches: User[] } | { ambiguous: false }> => {
  if (userLatestTextIdentifiesDirectoryRecord(latestText, target)) {
    return { ambiguous: false };
  }

  const response = await apiFetch(
    config,
    `/api/users/shared-display-name?name=${encodeURIComponent(target.name)}`,
  );
  const body = await parseApiJson<{ matches: User[] }>(response);
  if (body.matches.length <= 1) return { ambiguous: false };

  return { ambiguous: true, matches: body.matches };
};

/** Updates the signed-in member's profile (human review required). */
export const updateMyProfileTool = tool(
  async (input, config: RunnableConfig) => {
    const session = readSessionContext(config);
    const meResponse = await apiFetch(config, '/api/auth/me');
    const meBody = await parseApiJson<{ user: User }>(meResponse);
    const existing = meBody.user;

    const sanitized = sanitizeUserUpdateToolInput(input);
    const preview = buildUserUpdatePreview(existing, { ...sanitized });

    if (preview.changes.length === 0) {
      return { ok: false as const, error: 'No profile changes detected.' };
    }

    const approved = confirmMutation(
      {
        action: 'update_my_profile',
        preview,
        message: `Review profile changes for ${session.userName}`,
      },
      config,
    );

    if (!approved) {
      return { ok: false as const, cancelled: true as const };
    }

    const response = await apiFetch(config, '/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(sanitized),
    });
    const body = await parseApiJson<{ user: User }>(response);
    return { ok: true as const, user: body.user };
  },
  {
    name: 'update_my_profile',
    description: TOOL_MESSAGES.UPDATE_MY_PROFILE,
    schema: updateMyProfileToolInputSchema,
  },
);

/** Creates a directory user (admin, human review required). */
export const createUserTool = tool(
  async (input, config: RunnableConfig) => {
    requireAdminRole(config);

    const normalizedEmail = input.email.trim().toLowerCase();
    if (!userEmailSchema.safeParse(normalizedEmail).success) {
      return { ok: false as const, error: INVALID_EMAIL };
    }

    const preview = buildCreateUserPreview({
      name: input.name,
      email: normalizedEmail,
      date_of_birth: input.date_of_birth,
      bio: input.bio,
    });

    const approved = confirmMutation(
      {
        action: 'create_user',
        preview,
        message: `Create user ${preview.name} (${preview.email})?`,
      },
      config,
    );

    if (!approved) {
      return { ok: false as const, cancelled: true as const };
    }

    const response = await apiFetch(config, '/api/users', {
      method: 'POST',
      body: JSON.stringify({
        name: preview.name,
        email: preview.email,
        date_of_birth: preview.date_of_birth,
        bio: preview.bio ?? undefined,
      }),
    });

    const body = await parseApiJson<{ user: User }>(response);
    return { ok: true as const, user: body.user };
  },
  {
    name: 'create_user',
    description: TOOL_MESSAGES.CREATE_USER,
    schema: createUserToolInputSchema,
  },
);

/** Updates a directory user (admin, human review required). */
export const updateUserTool = tool(
  async (input, config: RunnableConfig) => {
    requireAdminRole(config);

    const target = await fetchUserById(config, input.id);
    if (!target) {
      return { ok: false as const, error: 'User not found.' };
    }

    const latestText =
      typeof config.metadata?.latestUserText === 'string'
        ? config.metadata.latestUserText
        : '';

    const dup = await checkDuplicateDisplayName(config, target, latestText);
    if (dup.ambiguous) {
      return {
        ambiguousDisplayName: true as const,
        matches: dup.matches,
        message: CONFIRM_MESSAGES.DUPLICATE_DISPLAY_NAME_BLOCKED,
        hint: CONFIRM_MESSAGES.DUPLICATE_DISPLAY_NAME_HINT,
      };
    }

    const sanitized = sanitizeUserUpdateToolInput(input);
    const preview = buildUserUpdatePreview(target, {
      ...sanitized,
      id: input.id,
    });

    if (preview.changes.length === 0) {
      return {
        ok: false as const,
        error: 'No changes detected for this user.',
      };
    }

    const approved = confirmMutation(
      {
        action: 'update_user',
        preview,
        message: `Review changes for ${target.name}`,
      },
      config,
    );

    if (!approved) {
      return { ok: false as const, cancelled: true as const };
    }

    const response = await apiFetch(
      config,
      `/api/users/${encodeURIComponent(input.id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: sanitized.name,
          date_of_birth: sanitized.date_of_birth,
          bio: sanitized.bio,
          status: input.status,
        }),
      },
    );

    const body = await parseApiJson<{ user: User }>(response);
    return { ok: true as const, user: body.user };
  },
  {
    name: 'update_user',
    description: TOOL_MESSAGES.UPDATE_USER,
    schema: updateUserToolInputSchema,
  },
);

/** Deletes a directory user (admin, human review required). */
export const deleteUserTool = tool(
  async (input, config: RunnableConfig) => {
    requireAdminRole(config);

    const target = await fetchUserById(config, input.id);
    if (!target) {
      return { ok: false as const, error: 'User not found.' };
    }

    const latestText =
      typeof config.metadata?.latestUserText === 'string'
        ? config.metadata.latestUserText
        : '';

    const dup = await checkDuplicateDisplayName(config, target, latestText);
    if (dup.ambiguous) {
      return {
        ambiguousDisplayName: true as const,
        matches: dup.matches,
        message: CONFIRM_MESSAGES.DUPLICATE_DISPLAY_NAME_BLOCKED,
        hint: CONFIRM_MESSAGES.DUPLICATE_DISPLAY_NAME_HINT,
      };
    }

    const preview = buildDeleteUserPreview(target);

    const approved = confirmMutation(
      {
        action: 'delete_user',
        preview,
        message: `Delete user ${target.name} (${target.email})?`,
      },
      config,
    );

    if (!approved) {
      return { ok: false as const, cancelled: true as const };
    }

    await apiFetch(config, `/api/users/${encodeURIComponent(input.id)}`, {
      method: 'DELETE',
    });

    return { ok: true as const, deleted: true, id: input.id };
  },
  {
    name: 'delete_user',
    description: TOOL_MESSAGES.DELETE_USER,
    schema: deleteUserToolInputSchema,
  },
);

export const memberMutationTools = [updateMyProfileTool] as const;

export const adminMutationTools = [
  createUserTool,
  updateUserTool,
  deleteUserTool,
] as const;
