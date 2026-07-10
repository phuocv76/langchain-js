// Libs for third party
import { NextResponse } from 'next/server';

// Internal
import { AUTH_COOKIE_NAME } from '@/lib/auth/constants';
import { getCurrentAuthSession } from '@/lib/auth/server-session';
import { getSessionCookieOptions } from '@/lib/auth/session';

export const GET = async (): Promise<NextResponse> => {
  const session = await getCurrentAuthSession();

  if (!session) {
    const response = NextResponse.json({ user: null }, { status: 401 });
    response.cookies.set(AUTH_COOKIE_NAME, '', {
      ...getSessionCookieOptions(),
      maxAge: 0,
    });
    return response;
  }

  return NextResponse.json({ user: session });
};
