export interface ClientUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  status: 'active' | 'inactive';
  created_at: number;
  date_of_birth: string | null;
  bio: string | null;
}

export const tryParseClientUser = (u: unknown): ClientUser | null => {
  if (!u || typeof u !== 'object') return null;
  const user = u as Record<string, unknown>;
  if (
    typeof user.id !== 'string' ||
    typeof user.name !== 'string' ||
    typeof user.email !== 'string' ||
    typeof user.created_at !== 'number' ||
    (user.role !== 'admin' && user.role !== 'member') ||
    (user.status !== 'active' && user.status !== 'inactive')
  ) {
    return null;
  }
  return {
    id: user.id as string,
    name: user.name as string,
    email: user.email as string,
    role: user.role as ClientUser['role'],
    status: user.status as ClientUser['status'],
    created_at: user.created_at as number,
    date_of_birth: (user.date_of_birth as string | null) ?? null,
    bio: (user.bio as string | null) ?? null,
  };
};

export const parseGetMyProfileOutput = (output: unknown): ClientUser | null => {
  if (!output || typeof output !== 'object') return null;
  return tryParseClientUser((output as Record<string, unknown>).profile);
};

export const parseOkUserOutput = (output: unknown): ClientUser | null => {
  if (!output || typeof output !== 'object') return null;
  const o = output as Record<string, unknown>;
  if (o.ok !== true) return null;
  return tryParseClientUser(o.user);
};

export const parseListUsersOutput = (output: unknown): ClientUser[] | null => {
  if (!output || typeof output !== 'object') return null;
  const raw = (output as Record<string, unknown>).users;
  if (!Array.isArray(raw)) return null;
  const users: ClientUser[] = [];
  for (const item of raw) {
    const parsed = tryParseClientUser(item);
    if (!parsed) return null;
    users.push(parsed);
  }
  return users;
};

export const parseFindUserOutput = (output: unknown): ClientUser | null => {
  if (!output || typeof output !== 'object') return null;
  return tryParseClientUser((output as Record<string, unknown>).user);
};

export const parseAmbiguousDuplicateOutput = (
  output: unknown,
): { matches: ClientUser[]; message: string; hint: string } | null => {
  if (!output || typeof output !== 'object') return null;
  const o = output as Record<string, unknown>;
  if (o.ambiguousDisplayName !== true) return null;
  if (typeof o.message !== 'string' || typeof o.hint !== 'string') return null;
  const raw = o.matches;
  if (!Array.isArray(raw)) return null;
  const matches: ClientUser[] = [];
  for (const item of raw) {
    const u = tryParseClientUser(item);
    if (!u) return null;
    matches.push(u);
  }
  return { matches, message: o.message, hint: o.hint };
};

export const parseKnowledgeMatches = (
  output: unknown,
): { content: string; similarity?: number }[] | null => {
  if (!output || typeof output !== 'object') return null;
  const o = output as Record<string, unknown>;
  if (o.ok !== true || !Array.isArray(o.matches)) return null;
  const matches: { content: string; similarity?: number }[] = [];
  for (const item of o.matches) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    if (typeof row.content !== 'string') return null;
    matches.push({
      content: row.content,
      similarity:
        typeof row.similarity === 'number' ? row.similarity : undefined,
    });
  }
  return matches;
};
