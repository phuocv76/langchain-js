// Libs for third party
import type Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

// Internal
import type { User, UserRole, UserStatus } from '../domain/user.js';
import { USER_DOMAIN_ERRORS } from '../constants/messages.js';
import { normalizeDirectoryDisplayNameKey } from '../lib/display-name-match.js';

const DEFAULT_NEW_USER_PASSWORD = 'Abcd@123';
const BCRYPT_ROUNDS = 12;

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

/** Lists every user ordered by newest first. */
export const listUsers = (db: Database.Database): User[] => {
  const rows = db
    .prepare(
      'SELECT id, name, email, role, status, created_at, date_of_birth, bio FROM users ORDER BY created_at DESC',
    )
    .all() as UserRow[];
  return rows.map(mapRow);
};

/** Loads a single user by id. */
export const getUser = (db: Database.Database, id: string): User | null => {
  const row = db
    .prepare(
      'SELECT id, name, email, role, status, created_at, date_of_birth, bio FROM users WHERE id = ? LIMIT 1',
    )
    .get(id) as UserRow | undefined;
  return row ? mapRow(row) : null;
};

/** Loads a user by normalized email. */
export const getUserByEmail = (
  db: Database.Database,
  email: string,
): User | null => {
  const norm = email.trim().toLowerCase();
  const row = db
    .prepare(
      'SELECT id, name, email, role, status, created_at, date_of_birth, bio FROM users WHERE email = ? LIMIT 1',
    )
    .get(norm) as UserRow | undefined;
  return row ? mapRow(row) : null;
};

/** Finds a user by email including password hash for login. */
export const getUserWithSecret = (
  db: Database.Database,
  email: string,
): (User & { password: string | null }) | null => {
  const norm = email.trim().toLowerCase();
  const row = db
    .prepare(
      'SELECT id, name, email, role, status, created_at, date_of_birth, bio, password FROM users WHERE email = ? LIMIT 1',
    )
    .get(norm) as (UserRow & { password: string | null }) | undefined;
  if (!row) return null;
  const { password, ...rest } = row;
  return { ...mapRow(rest), password };
};

/** Verifies a plaintext password against a bcrypt hash. */
export const verifyPassword = async (
  password: string,
  hash: string | null,
): Promise<boolean> => {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Creates a session row and returns the opaque session id. */
export const createSession = (
  db: Database.Database,
  userId: string,
): string => {
  const id = crypto.randomUUID();
  const expires_at = Date.now() + WEEK_MS;
  db.prepare(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
  ).run(id, userId, expires_at);
  return id;
};

/** Resolves a non-expired session to the linked user. */
export const getUserForSession = (
  db: Database.Database,
  sessionId: string,
): User | null => {
  const now = Date.now();
  const session = db
    .prepare(
      'SELECT user_id FROM sessions WHERE id = ? AND expires_at > ? LIMIT 1',
    )
    .get(sessionId, now) as { user_id: string } | undefined;
  if (!session) return null;
  const user = getUser(db, session.user_id);
  if (!user || user.status !== 'active') return null;
  return user;
};

/** Deletes a session row (sign-out). */
export const deleteSession = (
  db: Database.Database,
  sessionId: string,
): void => {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
};

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

/** Users sharing the same normalized display name. */
export const listUsersSharingDisplayNameKey = (
  db: Database.Database,
  name: string,
): User[] => {
  const key = normalizeDirectoryDisplayNameKey(name);
  return listUsers(db).filter(
    (u) => normalizeDirectoryDisplayNameKey(u.name) === key,
  );
};

/** Creates a member user with default password. */
export const createUser = async (
  db: Database.Database,
  input: { name: string; email: string; date_of_birth: string; bio?: string },
): Promise<User> => {
  const id = crypto.randomUUID();
  const created_at = Date.now();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const date_of_birth = input.date_of_birth.trim();
  const bio = input.bio?.trim();
  const password = await bcrypt.hash(DEFAULT_NEW_USER_PASSWORD, BCRYPT_ROUNDS);

  try {
    db.prepare(
      'INSERT INTO users (id, name, email, created_at, password, role, status, date_of_birth, bio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(
      id,
      name,
      email,
      created_at,
      password,
      'member',
      'active',
      date_of_birth,
      bio ?? null,
    );
  } catch (e) {
    if (isUniqueEmailViolation(e)) {
      throw new Error(USER_DOMAIN_ERRORS.EMAIL_ALREADY_IN_USE);
    }
    throw e;
  }

  const user = getUser(db, id);
  if (!user) throw new Error(USER_DOMAIN_ERRORS.FAILED_TO_READ_CREATED_USER);
  return user;
};

/** Updates identity/profile fields for any user (admin). */
export const updateUser = (
  db: Database.Database,
  input: {
    id: string;
    name?: string;
    date_of_birth?: string | null;
    bio?: string | null;
    status?: UserStatus;
  },
): User | null => {
  const existing = getUser(db, input.id);
  if (!existing) return null;

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  const { date_of_birth, bio } = mergeProfileInputs(input, existing);
  const nextStatus =
    input.status !== undefined ? input.status : existing.status;
  const becomesInactive =
    existing.status === 'active' && nextStatus === 'inactive';

  try {
    db.prepare(
      'UPDATE users SET name = ?, email = ?, date_of_birth = ?, bio = ?, status = ? WHERE id = ?',
    ).run(name, existing.email, date_of_birth, bio, nextStatus, input.id);
  } catch (e) {
    if (isUniqueEmailViolation(e)) {
      throw new Error(USER_DOMAIN_ERRORS.EMAIL_ALREADY_IN_USE);
    }
    throw e;
  }

  if (becomesInactive) {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(input.id);
  }

  return getUser(db, input.id);
};

/** Member self-service profile update. */
export const updateMemberProfile = (
  db: Database.Database,
  userId: string,
  input: {
    name?: string;
    date_of_birth?: string | null;
    bio?: string | null;
  },
): User | null => {
  const existing = getUser(db, userId);
  if (!existing) return null;
  return updateUser(db, { id: userId, ...input });
};

/** Deletes a user row when the id matches. */
export const deleteUser = (
  db: Database.Database,
  id: string,
): { deleted: boolean } => {
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return { deleted: result.changes > 0 };
};
