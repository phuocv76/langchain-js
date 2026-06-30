// Internal
import type { User, UserRole, UserStatus } from '../domain/user.js';
import { USER_DOMAIN_ERRORS } from '../constants/messages.js';
import { normalizeDirectoryDisplayNameKey } from '../lib/display-name-match.js';

const DEFAULT_NEW_USER_PASSWORD = 'Abcd@123';
const BCRYPT_ROUNDS = 12;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: number;
  date_of_birth: string | null;
  bio: string | null;
};

const normalizeRole = (role: string): UserRole =>
  role === 'admin' ? 'admin' : 'member';

const normalizeStatus = (raw: string): UserStatus =>
  raw.trim().toLowerCase() === 'inactive' ? 'inactive' : 'active';

const mapRow = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: normalizeRole(row.role),
  status: normalizeStatus(row.status ?? 'active'),
  created_at: row.created_at,
  date_of_birth: row.date_of_birth,
  bio: row.bio,
});

const isUniqueEmailViolation = (error: unknown): boolean =>
  error instanceof Error && error.message.toLowerCase().includes('unique');

const normalizeProfileString = (
  v: string | null | undefined,
  existing: string | null,
): string | null => {
  if (v === undefined) return existing;
  if (v === null) return null;
  const t = v.trim();
  return t === '' ? null : t;
};

const mergeProfileInputs = (
  input: { date_of_birth?: string | null; bio?: string | null },
  existing: User,
): { date_of_birth: string | null; bio: string | null } => ({
  date_of_birth: normalizeProfileString(
    input.date_of_birth,
    existing.date_of_birth,
  ),
  bio: normalizeProfileString(input.bio, existing.bio),
});

const hashPassword = async (password: string): Promise<string> => {
  const bcrypt = await import('bcryptjs');
  return bcrypt.default.hash(password, BCRYPT_ROUNDS);
};

/** Verifies a plaintext password against a bcrypt hash. */
export const verifyPassword = async (
  password: string,
  hash: string | null,
): Promise<boolean> => {
  if (!hash) return false;
  const bcrypt = await import('bcryptjs');
  return bcrypt.default.compare(password, hash);
};

/** Lists every user ordered by newest first. */
export const listUsers = async (db: D1Database): Promise<User[]> => {
  const rows = await db
    .prepare(
      'SELECT id, name, email, role, status, created_at, date_of_birth, bio FROM users ORDER BY created_at DESC',
    )
    .all<UserRow>();
  return (rows.results ?? []).map(mapRow);
};

/** Loads a single user by id. */
export const getUser = async (
  db: D1Database,
  id: string,
): Promise<User | null> => {
  const row = await db
    .prepare(
      'SELECT id, name, email, role, status, created_at, date_of_birth, bio FROM users WHERE id = ?1 LIMIT 1',
    )
    .bind(id)
    .first<UserRow>();
  return row ? mapRow(row) : null;
};

/** Loads a user by normalized email. */
export const getUserByEmail = async (
  db: D1Database,
  email: string,
): Promise<User | null> => {
  const norm = email.trim().toLowerCase();
  const row = await db
    .prepare(
      'SELECT id, name, email, role, status, created_at, date_of_birth, bio FROM users WHERE email = ?1 LIMIT 1',
    )
    .bind(norm)
    .first<UserRow>();
  return row ? mapRow(row) : null;
};

/** Finds a user by email including password hash for login. */
export const getUserWithSecret = async (
  db: D1Database,
  email: string,
): Promise<(User & { password: string | null }) | null> => {
  const norm = email.trim().toLowerCase();
  const row = await db
    .prepare(
      'SELECT id, name, email, role, status, created_at, date_of_birth, bio, password FROM users WHERE email = ?1 LIMIT 1',
    )
    .bind(norm)
    .first<UserRow & { password: string | null }>();
  if (!row) return null;
  const { password, ...rest } = row;
  return { ...mapRow(rest), password };
};

/** Creates a session row and returns the opaque session id. */
export const createSession = async (
  db: D1Database,
  userId: string,
): Promise<string> => {
  const id = crypto.randomUUID();
  const expires_at = Date.now() + WEEK_MS;
  await db
    .prepare(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES (?1, ?2, ?3)',
    )
    .bind(id, userId, expires_at)
    .run();
  return id;
};

/** Resolves a non-expired session to the linked user. */
export const getUserForSession = async (
  db: D1Database,
  sessionId: string,
): Promise<User | null> => {
  const now = Date.now();
  const session = await db
    .prepare(
      'SELECT user_id FROM sessions WHERE id = ?1 AND expires_at > ?2 LIMIT 1',
    )
    .bind(sessionId, now)
    .first<{ user_id: string }>();
  if (!session) return null;
  const user = await getUser(db, session.user_id);
  if (!user || user.status !== 'active') return null;
  return user;
};

/** Deletes a session row (sign-out). */
export const deleteSession = async (
  db: D1Database,
  sessionId: string,
): Promise<void> => {
  await db.prepare('DELETE FROM sessions WHERE id = ?1').bind(sessionId).run();
};

/** Users sharing the same normalized display name. */
export const listUsersSharingDisplayNameKey = async (
  db: D1Database,
  name: string,
): Promise<User[]> => {
  const key = normalizeDirectoryDisplayNameKey(name);
  const all = await listUsers(db);
  return all.filter((u) => normalizeDirectoryDisplayNameKey(u.name) === key);
};

/** Creates a member user with default password. */
export const createUser = async (
  db: D1Database,
  input: { name: string; email: string; date_of_birth: string; bio?: string },
): Promise<User> => {
  const id = crypto.randomUUID();
  const created_at = Date.now();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const date_of_birth = input.date_of_birth.trim();
  const bio = input.bio?.trim();
  const password = await hashPassword(DEFAULT_NEW_USER_PASSWORD);

  try {
    await db
      .prepare(
        'INSERT INTO users (id, name, email, created_at, password, role, status, date_of_birth, bio) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)',
      )
      .bind(
        id,
        name,
        email,
        created_at,
        password,
        'member',
        'active',
        date_of_birth,
        bio ? bio : null,
      )
      .run();
  } catch (e) {
    if (isUniqueEmailViolation(e)) {
      throw new Error(USER_DOMAIN_ERRORS.EMAIL_ALREADY_IN_USE);
    }
    throw e;
  }

  const user = await getUser(db, id);
  if (!user) throw new Error(USER_DOMAIN_ERRORS.FAILED_TO_READ_CREATED_USER);
  return user;
};

/** Updates identity/profile fields for any user (admin). */
export const updateUser = async (
  db: D1Database,
  input: {
    id: string;
    name?: string;
    date_of_birth?: string | null;
    bio?: string | null;
    status?: UserStatus;
  },
): Promise<User | null> => {
  const existing = await getUser(db, input.id);
  if (!existing) return null;

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  const { date_of_birth, bio } = mergeProfileInputs(input, existing);
  const nextStatus =
    input.status !== undefined ? input.status : existing.status;
  const becomesInactive =
    existing.status === 'active' && nextStatus === 'inactive';

  try {
    await db
      .prepare(
        'UPDATE users SET name = ?1, email = ?2, date_of_birth = ?3, bio = ?4, status = ?5 WHERE id = ?6',
      )
      .bind(name, existing.email, date_of_birth, bio, nextStatus, input.id)
      .run();
  } catch (e) {
    if (isUniqueEmailViolation(e)) {
      throw new Error(USER_DOMAIN_ERRORS.EMAIL_ALREADY_IN_USE);
    }
    throw e;
  }

  if (becomesInactive) {
    await db
      .prepare('DELETE FROM sessions WHERE user_id = ?1')
      .bind(input.id)
      .run();
  }

  return getUser(db, input.id);
};

/** Member self-service profile update. */
export const updateMemberProfile = async (
  db: D1Database,
  userId: string,
  input: {
    name?: string;
    date_of_birth?: string | null;
    bio?: string | null;
  },
): Promise<User | null> => {
  const existing = await getUser(db, userId);
  if (!existing) return null;
  return updateUser(db, { id: userId, ...input });
};

/** Deletes a user row when the id matches. */
export const deleteUser = async (
  db: D1Database,
  id: string,
): Promise<{ deleted: boolean }> => {
  const result = await db
    .prepare('DELETE FROM users WHERE id = ?1')
    .bind(id)
    .run();
  return { deleted: Number(result.meta.changes ?? 0) > 0 };
};
