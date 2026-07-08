// Internal
import { AUTH_COOKIE_NAME } from '@/lib/auth/constants';
import type { AuthSession } from '@/lib/auth/validation';

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;

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

export const encodeSession = (session: AuthSession): string =>
  Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');

export const decodeSession = (value: string | undefined): AuthSession | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as AuthSession;

    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.email !== 'string' ||
      typeof parsed.name !== 'string'
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
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

export const readSessionFromCookieHeader = (
  cookieHeader: string | null | undefined,
): AuthSession | null => {
  if (!cookieHeader) {
    return null;
  }

  const sessionCookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`));

  if (!sessionCookie) {
    return null;
  }

  const [, value] = sessionCookie.split('=');
  return decodeSession(value);
};

export { AUTH_COOKIE_NAME, SESSION_MAX_AGE_SECONDS };
