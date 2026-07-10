// Libs for third party
import { NextResponse } from 'next/server';

// Internal
import { AUTH_COOKIE_NAME } from '@/lib/auth/constants';
import { isTrustedRequestOrigin } from '@/lib/auth/request';
import { getSessionCookieOptions } from '@/lib/auth/session';

export const POST = async (request: Request): Promise<NextResponse> => {
  if (!isTrustedRequestOrigin(request)) {
    return NextResponse.json(
      { error: 'Invalid request origin.' },
      { status: 403 },
    );
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set(AUTH_COOKIE_NAME, '', {
    ...getSessionCookieOptions(),
    maxAge: 0,
  });

  return response;
};
