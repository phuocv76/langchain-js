export interface CreateUserPreview {
  kind: 'createUser';
  name: string;
  email: string;
  date_of_birth: string;
  bio: string | null;
}

export interface UserFieldChange {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
}

export interface UserUpdatePreview {
  kind: 'userUpdate';
  id: string;
  name: string;
  email: string;
  changes: UserFieldChange[];
}

export interface DeleteUserPreview {
  kind: 'deleteUser';
  id: string;
  name: string;
  email: string;
}

export type MutationPreview =
  CreateUserPreview | UserUpdatePreview | DeleteUserPreview;

/** Parses a create_user interrupt preview payload when structured. */
export const parseCreateUserPreview = (
  preview: unknown,
): CreateUserPreview | null => {
  if (!preview || typeof preview !== 'object') return null;
  const row = preview as Record<string, unknown>;
  if (row.kind !== 'createUser') return null;
  if (typeof row.name !== 'string' || typeof row.email !== 'string')
    return null;
  if (typeof row.date_of_birth !== 'string') return null;
  const bio =
    row.bio === null ? null : typeof row.bio === 'string' ? row.bio : undefined;
  if (bio === undefined) return null;

  return {
    kind: 'createUser',
    name: row.name,
    email: row.email,
    date_of_birth: row.date_of_birth,
    bio,
  };
};

/** Parses a single {field,label,oldValue,newValue} change entry. */
const parseFieldChange = (item: unknown): UserFieldChange | null => {
  if (!item || typeof item !== 'object') return null;
  const row = item as Record<string, unknown>;
  if (
    typeof row.field !== 'string' ||
    typeof row.label !== 'string' ||
    typeof row.oldValue !== 'string' ||
    typeof row.newValue !== 'string'
  ) {
    return null;
  }
  return {
    field: row.field,
    label: row.label,
    oldValue: row.oldValue,
    newValue: row.newValue,
  };
};

/** Parses an update_user / update_my_profile preview payload when structured. */
export const parseUserUpdatePreview = (
  preview: unknown,
): UserUpdatePreview | null => {
  if (!preview || typeof preview !== 'object') return null;
  const row = preview as Record<string, unknown>;
  if (row.kind !== 'userUpdate') return null;
  if (
    typeof row.id !== 'string' ||
    typeof row.name !== 'string' ||
    typeof row.email !== 'string'
  ) {
    return null;
  }
  if (!Array.isArray(row.changes)) return null;

  const changes: UserFieldChange[] = [];
  for (const item of row.changes) {
    const change = parseFieldChange(item);
    if (!change) return null;
    changes.push(change);
  }

  return {
    kind: 'userUpdate',
    id: row.id,
    name: row.name,
    email: row.email,
    changes,
  };
};

/** Parses a delete_user preview payload when structured. */
export const parseDeleteUserPreview = (
  preview: unknown,
): DeleteUserPreview | null => {
  if (!preview || typeof preview !== 'object') return null;
  const row = preview as Record<string, unknown>;
  if (row.kind !== 'deleteUser') return null;
  if (
    typeof row.id !== 'string' ||
    typeof row.name !== 'string' ||
    typeof row.email !== 'string'
  ) {
    return null;
  }

  return {
    kind: 'deleteUser',
    id: row.id,
    name: row.name,
    email: row.email,
  };
};

/** Returns a structured preview when the payload is recognized. */
export const parseMutationPreview = (
  preview: unknown,
): MutationPreview | null =>
  parseCreateUserPreview(preview) ??
  parseUserUpdatePreview(preview) ??
  parseDeleteUserPreview(preview);
