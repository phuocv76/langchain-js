import 'server-only';

import { cookies } from 'next/headers';

import { AUTH_COOKIE_NAME } from '@/lib/auth/constants';
import { createSessionFromFirebase } from '@/lib/auth/session';
import type { AuthSession } from '@/lib/auth/validation';
import {
  getFirebaseAdminAuth,
  isFirebaseAdminConfigured,
} from '@/lib/firebase/admin';

/** Verifies the Firebase-signed session cookie, including revocation status. */
export const verifyFirebaseSession = async (
  sessionCookie: string | undefined,
): Promise<AuthSession | null> => {
  if (!sessionCookie || !isFirebaseAdminConfigured()) {
    return null;
  }

  try {
    const decoded = await getFirebaseAdminAuth().verifySessionCookie(
      sessionCookie,
      true,
    );
    return createSessionFromFirebase(decoded);
  } catch {
    return null;
  }
};

/** Resolves the authenticated user for server routes and the CopilotKit proxy. */
export const getCurrentAuthSession = async (): Promise<AuthSession | null> => {
  const cookieStore = await cookies();
  return verifyFirebaseSession(cookieStore.get(AUTH_COOKIE_NAME)?.value);
};
