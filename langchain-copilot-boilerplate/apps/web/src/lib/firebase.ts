// Libs for third party
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';

/**
 * Vite only inlines `VITE_*` vars when they are referenced with a static
 * property name. Dynamic access like `import.meta.env[name]` is undefined
 * in the browser bundle, so keep these as literal lookups.
 */
const FIREBASE_API_KEY = import.meta.env.VITE_FIREBASE_API_KEY?.trim();
const FIREBASE_AUTH_DOMAIN = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim();
const FIREBASE_PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim();
const FIREBASE_APP_ID = import.meta.env.VITE_FIREBASE_APP_ID?.trim();

export const isFirebaseConfigured = (): boolean =>
  Boolean(
    FIREBASE_API_KEY &&
    FIREBASE_AUTH_DOMAIN &&
    FIREBASE_PROJECT_ID &&
    FIREBASE_APP_ID,
  );

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

const getFirebaseApp = (): FirebaseApp => {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is not configured. Set VITE_FIREBASE_* in apps/web/.env.',
    );
  }

  firebaseApp = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: FIREBASE_API_KEY!,
        authDomain: FIREBASE_AUTH_DOMAIN!,
        projectId: FIREBASE_PROJECT_ID!,
        appId: FIREBASE_APP_ID!,
      });

  return firebaseApp;
};

export const getFirebaseAuth = (): Auth => {
  if (!firebaseAuth) {
    firebaseAuth = getAuth(getFirebaseApp());
  }

  return firebaseAuth;
};

export const getGoogleProvider = (): GoogleAuthProvider => {
  if (!googleProvider) {
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  }

  return googleProvider;
};
