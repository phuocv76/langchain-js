// Libs for third party
import { NextResponse } from 'next/server';

// Internal
import { AUTH_COOKIE_NAME } from '@/lib/auth/constants';
import { getSessionCookieOptions } from '@/lib/auth/session';

export const POST = async (): Promise<NextResponse> => {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(AUTH_COOKIE_NAME, '', {
    ...getSessionCookieOptions(),
    maxAge: 0,
  });

  return response;
};
