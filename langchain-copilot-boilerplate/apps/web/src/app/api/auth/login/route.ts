// Libs for third party
import { NextResponse } from 'next/server';

// Internal
import { AUTH_COOKIE_NAME } from '@/lib/auth/constants';
import {
  createSessionFromFirebase,
  getSessionCookieOptions,
  isRecentFirebaseSignIn,
  SESSION_MAX_AGE_MILLISECONDS,
} from '@/lib/auth/session';
import { isTrustedRequestOrigin } from '@/lib/auth/request';
import { loginSchema } from '@/lib/auth/validation';
import {
  getFirebaseAdminAuth,
  isFirebaseAdminConfigured,
} from '@/lib/firebase/admin';

export const POST = async (request: Request): Promise<NextResponse> => {
  if (!isTrustedRequestOrigin(request)) {
    return NextResponse.json(
      { error: 'Invalid request origin.' },
      { status: 403 },
    );
  }

  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'Firebase Admin is not configured on the server.' },
      { status: 500 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.flatten().fieldErrors.idToken?.[0] ?? 'Invalid token',
      },
      { status: 400 },
    );
  }

  try {
    const auth = getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(parsed.data.idToken, true);

    if (!isRecentFirebaseSignIn(decoded.auth_time)) {
      return NextResponse.json(
        { error: 'Recent sign-in required.' },
        { status: 401 },
      );
    }

    const sessionCookie = await auth.createSessionCookie(parsed.data.idToken, {
      expiresIn: SESSION_MAX_AGE_MILLISECONDS,
    });
    const session = createSessionFromFirebase(decoded);
    const response = NextResponse.json({ user: session });

    response.cookies.set(
      AUTH_COOKIE_NAME,
      sessionCookie,
      getSessionCookieOptions(),
    );

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Invalid or expired sign-in token.' },
      { status: 401 },
    );
  }
};
