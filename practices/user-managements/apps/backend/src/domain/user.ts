export type UserRole = 'admin' | 'member';
export type UserStatus = 'active' | 'inactive';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: number;
  date_of_birth: string | null;
  bio: string | null;
}

/** JSON-safe user payload for APIs and chat tools (no secrets). */
export const userResponseBody = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  created_at: user.created_at,
  date_of_birth: user.date_of_birth,
  bio: user.bio,
});
