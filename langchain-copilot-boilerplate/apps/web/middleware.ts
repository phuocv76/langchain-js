// Libs for third party
import { NextResponse, type NextRequest } from 'next/server';

// Internal
import {
  APP_PATH,
  isLoginPath,
  isPublicPath,
  LOGIN_PATH,
  PUBLIC_API_PATHS,
} from '@/lib/auth/constants';
import { readSessionFromCookieHeader } from '@/lib/auth/session';

const isPublicApiPath = (pathname: string): boolean =>
  PUBLIC_API_PATHS.some((path) => pathname === path);

export const middleware = (request: NextRequest): NextResponse => {
  const { pathname } = request.nextUrl;
  const session = readSessionFromCookieHeader(request.headers.get('cookie'));
  const isAuthenticated = Boolean(session);

  if (pathname.startsWith('/api/auth/') && isPublicApiPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/') && !isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isLoginPath(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL(APP_PATH, request.url));
    }

    if (pathname === '/login') {
      return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
    }

    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL(LOGIN_PATH, request.url);

    if (pathname !== APP_PATH) {
      loginUrl.searchParams.set('next', pathname);
    }

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
};

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
