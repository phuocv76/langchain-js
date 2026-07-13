// Libs for third party
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

// Internal
import { env } from '@agent/config/env.js';

let adminApp: App | undefined;
let adminAuth: Auth | undefined;

export const isFirebaseAdminConfigured = (): boolean =>
  Boolean(
    env.FIREBASE_PROJECT_ID &&
      env.FIREBASE_CLIENT_EMAIL &&
      env.FIREBASE_PRIVATE_KEY,
  );

export const getFirebaseAdminAuth = (): Auth => {
  if (adminAuth) {
    return adminAuth;
  }

  if (!isFirebaseAdminConfigured()) {
    throw new Error('Firebase Admin is not configured for the agent runtime.');
  }

  adminApp ??=
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID!,
        clientEmail: env.FIREBASE_CLIENT_EMAIL!,
        privateKey: env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      }),
      projectId: env.FIREBASE_PROJECT_ID!,
    });
  adminAuth = getAuth(adminApp);
  return adminAuth;
};
