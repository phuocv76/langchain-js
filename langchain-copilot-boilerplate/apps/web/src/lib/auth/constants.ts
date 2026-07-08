/** Default landing page for unauthenticated users. */
export const LOGIN_PATH = '/' as const;

/** Main authenticated chat workspace. */
export const APP_PATH = '/chat' as const;

/** Cookie name for the signed-in user session. */
export const AUTH_COOKIE_NAME = 'lc-auth-session';

/** Public routes that do not require authentication. */
export const PUBLIC_PATHS = [LOGIN_PATH, '/login'] as const;

/** API routes that stay accessible without a session. */
export const PUBLIC_API_PATHS = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
] as const;

const publicPathSet = new Set<string>(PUBLIC_PATHS);

export const isPublicPath = (pathname: string): boolean =>
  publicPathSet.has(pathname);

export const isLoginPath = (pathname: string): boolean =>
  pathname === LOGIN_PATH || pathname === '/login';
