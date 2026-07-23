// Libs for third party
import { createRemoteJWKSet, jwtVerify } from 'jose';

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  ),
);

export type VerifiedFirebaseUser = {
  readonly userId: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly roles: unknown;
};

/**
 * Verifies a Firebase ID token with Google's JWKS (no Admin private key).
 * Same approach as workers/realtime-worker — only FIREBASE_PROJECT_ID is required.
 */
export const verifyFirebaseIdToken = async (
  idToken: string,
  projectId: string,
): Promise<VerifiedFirebaseUser> => {
  const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  const userId = typeof payload.sub === 'string' ? payload.sub : undefined;
  const email = typeof payload.email === 'string' ? payload.email : undefined;
  const emailVerified = payload.email_verified === true;

  if (!userId || !email) {
    throw new FirebaseAuthError(
      'Firebase token is missing a subject or email claim',
      401,
    );
  }

  return {
    userId,
    email,
    emailVerified,
    roles: payload.roles,
  };
};

export class FirebaseAuthError extends Error {
  override name = 'FirebaseAuthError';
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
