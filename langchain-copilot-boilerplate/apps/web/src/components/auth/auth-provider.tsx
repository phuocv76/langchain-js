'use client';

// Libs for third party
import {
  onIdTokenChanged,
  signInWithPopup,
  signOut,
  type User,
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
import {
  getFirebaseAuth,
  getGoogleProvider,
  isFirebaseConfigured,
} from '@/lib/firebase';

type AuthContextValue = {
  user: User | null;
  /** Fresh Firebase ID token; rotated by the SDK before it expires (~1h). */
  idToken: string | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element => {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  // NEXT_PUBLIC_* config is inlined at build time, so this initial value is
  // identical on server and client; without Firebase there is no session to
  // wait for.
  const [isLoading, setIsLoading] = useState(() => isFirebaseConfigured());

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return;
    }

    // Fires on sign-in, sign-out, and every SDK-driven token refresh, so the
    // context always holds a token the agent will accept.
    return onIdTokenChanged(getFirebaseAuth(), (nextUser) => {
      setUser(nextUser);
      setIsLoading(false);

      if (!nextUser) {
        setIdToken(null);
        return;
      }

      void nextUser.getIdToken().then(setIdToken);
    });
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    if (!isFirebaseConfigured()) {
      throw new Error(
        'Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* in apps/web/.env.',
      );
    }

    await signInWithPopup(getFirebaseAuth(), getGoogleProvider());
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    if (isFirebaseConfigured()) {
      await signOut(getFirebaseAuth());
    }
  }, []);

  const value = useMemo(
    () => ({ user, idToken, isLoading, signInWithGoogle, logout }),
    [user, idToken, isLoading, signInWithGoogle, logout],
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
