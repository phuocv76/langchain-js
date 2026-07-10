'use client';

// Libs for third party
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Internal
import { useAuth } from '@/components/auth/auth-provider';
import { LOGIN_PATH } from '@/lib/auth/constants';

/** Redirects unauthenticated users away from protected pages. */
export const AuthGate = ({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element | null => {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(LOGIN_PATH);
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};
