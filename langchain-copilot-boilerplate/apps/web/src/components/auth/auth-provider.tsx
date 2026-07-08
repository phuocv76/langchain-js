'use client';

// Libs for third party
import {
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

// Internal
import type { AuthSession } from '@/lib/auth/validation';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import {
  getFirebaseAuth,
  getGoogleProvider,
} from '@/lib/firebase/client';

type AuthContextValue = {
  user: AuthSession | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const establishServerSession = async (idToken: string): Promise<AuthSession> => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(data?.error ?? 'Unable to sign in');
  }

  const data = (await response.json()) as { user: AuthSession };
  return data.user;
};

export const AuthProvider = ({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element => {
  const [user, setUser] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async (): Promise<void> => {
    const response = await fetch('/api/auth/session');

    if (!response.ok) {
      setUser(null);
      return;
    }

    const data = (await response.json()) as { user: AuthSession | null };
    setUser(data.user);
  }, []);

  useEffect(() => {
    void refreshSession().finally(() => {
      setIsLoading(false);
    });
  }, [refreshSession]);

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase is not configured. Check your environment variables.');
    }

    const auth = getFirebaseAuth();
    const credential = await signInWithPopup(auth, getGoogleProvider());
    const idToken = await credential.user.getIdToken();
    const session = await establishServerSession(idToken);
    setUser(session);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    if (isFirebaseConfigured()) {
      await signOut(getFirebaseAuth());
    }

    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      signInWithGoogle,
      logout,
      refreshSession,
    }),
    [user, isLoading, signInWithGoogle, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};
