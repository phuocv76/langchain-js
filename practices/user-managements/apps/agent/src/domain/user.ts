/** User record shape shared between agent preview helpers and API responses. */
export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  status: 'active' | 'inactive';
  created_at: number;
  date_of_birth: string | null;
  bio: string | null;
};

export type UserStatus = User['status'];
