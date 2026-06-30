// Libs for third party
import { useEffect, useState } from 'react';

// Internal
import { ListUsersTable } from '@/components/tool-display/list-users-table';
import { UserResultCard } from '@/components/tool-display/user-result-card';
import { MESSAGES } from '@/lib/constants/messages';
import type { ClientUser } from '@/lib/tool-output-parsers';

interface UserDirectoryProps {
  readonly isAdmin: boolean;
}

/** Dashboard directory table (admin) or member profile card. */
export const UserDirectory = ({
  isAdmin,
}: UserDirectoryProps): React.JSX.Element => {
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [profile, setProfile] = useState<ClientUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        if (isAdmin) {
          const res = await fetch('/api/users', { credentials: 'include' });
          const body = (await res.json()) as {
            users?: ClientUser[];
            error?: string;
          };
          if (!res.ok) throw new Error(body.error ?? 'Failed to load users');
          setUsers(body.users ?? []);
        } else {
          const res = await fetch('/api/auth/me', { credentials: 'include' });
          const body = (await res.json()) as {
            user?: ClientUser;
            error?: string;
          };
          if (!res.ok) throw new Error(body.error ?? 'Failed to load profile');
          setProfile(body.user ?? null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Load failed');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [isAdmin]);

  if (loading) {
    return <p className="dashboard__muted">{MESSAGES.LOADING}</p>;
  }

  if (error) {
    return <p className="dashboard__error">{error}</p>;
  }

  if (!isAdmin && profile) {
    return (
      <section className="dashboard__section">
        <h2>{MESSAGES.PROFILE_TITLE}</h2>
        <UserResultCard user={profile} variant="profile-loaded" />
      </section>
    );
  }

  return (
    <section className="dashboard__section">
      <ListUsersTable users={users} />
    </section>
  );
};
