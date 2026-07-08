// Libs for third party
import { NextResponse } from 'next/server';

// Internal
import { AUTH_COOKIE_NAME } from '@/lib/auth/constants';
import {
  createSessionFromFirebase,
  encodeSession,
  getSessionCookieOptions,
} from '@/lib/auth/session';
import { loginSchema } from '@/lib/auth/validation';
import {
  getFirebaseAdminAuth,
  isFirebaseAdminConfigured,
} from '@/lib/firebase/admin';

export const POST = async (request: Request): Promise<NextResponse> => {
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
      { error: parsed.error.flatten().fieldErrors.idToken?.[0] ?? 'Invalid token' },
      { status: 400 },
    );
  }

  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(parsed.data.idToken);
    const session = createSessionFromFirebase(decoded);
    const response = NextResponse.json({ user: session });

    response.cookies.set(
      AUTH_COOKIE_NAME,
      encodeSession(session),
      getSessionCookieOptions(),
    );

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid or expired sign-in token.' }, { status: 401 });
  }
};
