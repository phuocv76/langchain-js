'use client';

// Libs for third party
import { signInWithPopup, signOut } from 'firebase/auth';
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
import { getFirebaseAuth, getGoogleProvider } from '@/lib/firebase/client';

type AuthContextValue = {
  user: AuthSession | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const establishServerSession = async (
  idToken: string,
): Promise<{ status: 'ok'; user: AuthSession } | { status: 'retry' }> => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (response.status === 409) {
    return { status: 'retry' };
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(data?.error ?? 'Unable to sign in');
  }

  const data = (await response.json()) as { user: AuthSession };
  return { status: 'ok', user: data.user };
};

const fetchServerSession = async (): Promise<AuthSession | null> => {
  const response = await fetch('/api/auth/session', { cache: 'no-store' });
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { user: AuthSession | null };
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
    setUser(await fetchServerSession());
  }, []);

  useEffect(() => {
    let active = true;

    void fetchServerSession().then((session) => {
      if (active) {
        setUser(session);
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    if (!isFirebaseConfigured()) {
      throw new Error(
        'Firebase is not configured. Check your environment variables.',
      );
    }

    const auth = getFirebaseAuth();
    const credential = await signInWithPopup(auth, getGoogleProvider());
    let idToken = await credential.user.getIdToken();
    let loginResult = await establishServerSession(idToken);

    if (loginResult.status === 'retry') {
      idToken = await credential.user.getIdToken(true);
      loginResult = await establishServerSession(idToken);
    }

    if (loginResult.status === 'retry') {
      throw new Error('Unable to provision sign-in claims. Please try again.');
    }

    await signOut(auth);
    setUser(loginResult.user);
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
