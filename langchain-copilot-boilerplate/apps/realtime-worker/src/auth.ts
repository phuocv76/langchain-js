import { createRemoteJWKSet, jwtVerify } from 'jose';

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  ),
);

export type VerifiedUser = {
  readonly userId: string;
  readonly email: string;
};

/**
 * Verifies a Firebase ID token and returns the signed-in user id.
 *
 * Browsers cannot set Authorization on native WebSocket; callers may also
 * pass the token via `?token=` (see extractBearerOrQueryToken).
 */
export const verifyFirebaseIdToken = async (
  idToken: string,
  projectId: string,
): Promise<VerifiedUser> => {
  if (!projectId) {
    throw new AuthError('FIREBASE_PROJECT_ID is not configured', 503);
  }

  const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  const userId = typeof payload.sub === 'string' ? payload.sub : undefined;
  const email = typeof payload.email === 'string' ? payload.email : undefined;
  const emailVerified = payload.email_verified === true;

  if (!userId || !email || !emailVerified) {
    throw new AuthError('Firebase token is missing a verified email', 401);
  }

  return { userId, email };
};

export const extractBearerOrQueryToken = (
  request: Request,
): string | undefined => {
  const header = request.headers.get('Authorization');
  if (header?.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim();
    if (token) return token;
  }
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token')?.trim();
  return queryToken || undefined;
};

export class AuthError extends Error {
  override name = 'AuthError';
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
