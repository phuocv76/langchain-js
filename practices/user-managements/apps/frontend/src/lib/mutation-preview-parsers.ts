export interface CreateUserPreview {
  kind: 'createUser';
  name: string;
  email: string;
  date_of_birth: string;
  bio: string | null;
}

export type MutationPreview = CreateUserPreview;

/** Parses a mutation interrupt preview payload when structured. */
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

/** Returns a structured preview when the payload is recognized. */
export const parseMutationPreview = (
  preview: unknown,
): MutationPreview | null => parseCreateUserPreview(preview);
