'use client';

// Libs for third party
import { LogOut } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Internal
import { Button } from '@repo/ui/button';
import { useAuth } from '@/components/auth/auth-provider';
import { LOGIN_PATH } from '@/lib/auth/constants';

/** Signed-in user menu with profile info and logout. */
export const UserMenu = (): React.JSX.Element | null => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!user) {
    return null;
  }

  const handleLogout = async (): Promise<void> => {
    setIsSigningOut(true);

    try {
      await logout();
      router.replace(LOGIN_PATH);
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {user.photoURL ? (
        <Image
          src={user.photoURL}
          alt=""
          width={28}
          height={28}
          className="hidden h-7 w-7 rounded-full sm:block"
        />
      ) : null}
      <span
        className="hidden max-w-[220px] truncate text-sm text-muted-foreground sm:inline"
        title={user.email}
      >
        {user.name || user.email}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          void handleLogout();
        }}
        disabled={isSigningOut}
      >
        <LogOut className="h-4 w-4" />
        {isSigningOut ? 'Signing out…' : 'Sign out'}
      </Button>
    </div>
  );
};
