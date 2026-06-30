// Internal
import type { User, UserStatus } from '../domain/user.js';
import { sanitizeUserUpdateToolInput } from './profile-patch.js';

export type UserFieldChange = {
  field: 'name' | 'date_of_birth' | 'bio' | 'status';
  label: string;
  oldValue: string;
  newValue: string;
};

export type UserUpdatePreviewPayload = {
  kind: 'userUpdate';
  id: string;
  name: string;
  email: string;
  changes: UserFieldChange[];
};

export type CreateUserPreviewPayload = {
  kind: 'createUser';
  name: string;
  email: string;
  date_of_birth: string;
  bio: string | null;
};

export type DeleteUserPreviewPayload = {
  kind: 'deleteUser';
  id: string;
  name: string;
  email: string;
};

const EM_DASH = '—';

const displayNullable = (v: string | null | undefined): string => {
  const t = v?.trim();
  return t ? t : EM_DASH;
};

const displayStatus = (s: UserStatus): string =>
  s === 'inactive' ? 'Inactive' : 'Active';

/** Builds a confirmation preview with only fields that differ from existing. */
export const buildUserUpdatePreview = (
  existing: User,
  input: unknown,
): UserUpdatePreviewPayload => {
  const raw =
    typeof input === 'object' && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const p = sanitizeUserUpdateToolInput(input);
  const id = typeof p.id === 'string' ? p.id : existing.id;
  const changes: UserFieldChange[] = [];

  const statusCandidate: UserStatus | undefined =
    p.status === 'active' || p.status === 'inactive'
      ? p.status
      : raw.status === 'active' || raw.status === 'inactive'
        ? raw.status
        : undefined;

  if (typeof p.name === 'string') {
    const next = p.name.trim();
    const old = existing.name.trim();
    if (next !== old) {
      changes.push({
        field: 'name',
        label: 'Name',
        oldValue: old || EM_DASH,
        newValue: next || EM_DASH,
      });
    }
  }

  if ('date_of_birth' in p) {
    const next = p.date_of_birth as string | null;
    if (next !== existing.date_of_birth) {
      changes.push({
        field: 'date_of_birth',
        label: 'Date of birth',
        oldValue: displayNullable(existing.date_of_birth),
        newValue: displayNullable(next),
      });
    }
  }

  if ('bio' in p) {
    const next = p.bio as string | null;
    if (next !== existing.bio) {
      changes.push({
        field: 'bio',
        label: 'Bio',
        oldValue: displayNullable(existing.bio),
        newValue: displayNullable(next),
      });
    }
  }

  if (statusCandidate && statusCandidate !== existing.status) {
    changes.push({
      field: 'status',
      label: 'Status',
      oldValue: displayStatus(existing.status),
      newValue: displayStatus(statusCandidate),
    });
  }

  return {
    kind: 'userUpdate',
    id,
    name: existing.name,
    email: existing.email,
    changes,
  };
};

/** Builds preview payload for create_user. */
export const buildCreateUserPreview = (input: {
  name: string;
  email: string;
  date_of_birth: string;
  bio?: string;
}): CreateUserPreviewPayload => ({
  kind: 'createUser',
  name: input.name.trim(),
  email: input.email.trim().toLowerCase(),
  date_of_birth: input.date_of_birth.trim(),
  bio: input.bio?.trim() ? input.bio.trim() : null,
});

/** Builds preview payload for delete_user. */
export const buildDeleteUserPreview = (
  user: User,
): DeleteUserPreviewPayload => ({
  kind: 'deleteUser',
  id: user.id,
  name: user.name,
  email: user.email,
});
