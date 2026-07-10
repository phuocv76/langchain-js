// Internal
import { AUTH_COOKIE_NAME } from '@/lib/auth/constants';
import type { AuthSession } from '@/lib/auth/validation';

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;
export const SESSION_MAX_AGE_MILLISECONDS = SESSION_MAX_AGE_SECONDS * 1000;
const RECENT_SIGN_IN_MAX_AGE_SECONDS = 5 * 60;

export const createSessionFromFirebase = (user: {
  uid: string;
  email?: string | null;
  name?: string | null;
  picture?: string | null;
}): AuthSession => ({
  id: user.uid,
  email: user.email ?? '',
  name: user.name ?? user.email ?? 'User',
  ...(user.picture ? { photoURL: user.picture } : {}),
});

/** Rejects stolen/stale ID tokens that were not issued by a recent sign-in. */
export const isRecentFirebaseSignIn = (
  authTimeSeconds: number,
  nowMilliseconds = Date.now(),
): boolean => {
  const ageSeconds = nowMilliseconds / 1000 - authTimeSeconds;
  return ageSeconds >= -60 && ageSeconds <= RECENT_SIGN_IN_MAX_AGE_SECONDS;
};

export const getSessionCookieOptions = (): {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: '/';
  maxAge: number;
} => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS,
});

export { AUTH_COOKIE_NAME, SESSION_MAX_AGE_SECONDS };
