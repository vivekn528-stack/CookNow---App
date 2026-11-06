import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';
import appletConfig from '../../firebase-applet-config.json';

// Public client Firebase configuration for project cooknow-9444c
// These values are designed for browser usage and are NOT server secrets.
export const firebaseConfig = {
  apiKey: appletConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: appletConfig.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'cooknow-9444c.firebaseapp.com',
  projectId: appletConfig.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || 'cooknow-9444c',
  storageBucket:
    appletConfig.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'cooknow-9444c.firebasestorage.app',
  messagingSenderId: appletConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: appletConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID || '',
  firestoreDatabaseId: appletConfig.firestoreDatabaseId || '',
};

export const isFirebaseConfigured = (): boolean => {
  const key = firebaseConfig.apiKey;
  return Boolean(
    key &&
      key.trim() !== '' &&
      !key.includes('placeholder') &&
      !key.includes('YOUR_') &&
      key.length > 10
  );
};

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;
let functionsInstance: Functions | null = null;

function setupFirebase(config: typeof firebaseConfig): boolean {
  if (
    !config.apiKey ||
    config.apiKey.includes('placeholder') ||
    config.apiKey.length < 10
  ) {
    return false;
  }
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(config);
    authInstance = getAuth(app);
    firestoreInstance =
      config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
        ? getFirestore(app, config.firestoreDatabaseId)
        : getFirestore(app);
    storageInstance = getStorage(app);
    functionsInstance = getFunctions(app, 'asia-south1');
    return true;
  } catch (err) {
    console.warn('[Firebase] Initialization error:', err);
    return false;
  }
}

// Initial setup from configuration
if (isFirebaseConfigured()) {
  setupFirebase(firebaseConfig);
}

// Dynamic public configuration hydration
// In Google AI Studio Build mode or during preview without rebuild, public variables
// in process.env are also served via /api/config/public-client to guarantee client access.
let configPromise: Promise<boolean> | null = null;

export async function ensureFirebaseInitialized(): Promise<boolean> {
  if (isFirebaseConfigured() && authInstance) {
    return true;
  }

  if (configPromise) return configPromise;

  configPromise = (async () => {
    try {
      const res = await fetch('/api/config/public-client');
      if (res.ok) {
        const data = await res.json();
        if (data.firebase?.apiKey) {
          firebaseConfig.apiKey = data.firebase.apiKey;
          if (data.firebase.appId) firebaseConfig.appId = data.firebase.appId;
          if (data.firebase.authDomain) firebaseConfig.authDomain = data.firebase.authDomain;
          if (data.firebase.projectId) firebaseConfig.projectId = data.firebase.projectId;
          if (data.firebase.storageBucket)
            firebaseConfig.storageBucket = data.firebase.storageBucket;
          if (data.firebase.messagingSenderId)
            firebaseConfig.messagingSenderId = data.firebase.messagingSenderId;

          setupFirebase(firebaseConfig);
          return isFirebaseConfigured();
        }
      }
    } catch (e) {
      console.warn('[Firebase] Public config fetch failed:', e);
    }
    return isFirebaseConfigured();
  })();

  return configPromise;
}

// Trigger background hydration immediately on module load
ensureFirebaseInitialized();

export const getFirebaseAuth = (): Auth | null => authInstance;
export const auth = authInstance;

export const getFirestoreDb = (): Firestore | null => firestoreInstance;
export const db = firestoreInstance;
export const firestore = firestoreInstance;

export const getFirebaseStorage = (): FirebaseStorage | null => storageInstance;
export const storage = storageInstance;

export const getFirebaseFunctions = (): Functions | null => functionsInstance;
export const functions = functionsInstance;

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export interface GoogleSignInResult {
  user: User | null;
  idToken: string | null;
  error: string | null;
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  await ensureFirebaseInitialized();
  const currentAuth = authInstance || auth;

  if (!isFirebaseConfigured() || !currentAuth) {
    return {
      user: null,
      idToken: null,
      error:
        'Firebase Google Sign-In is not configured yet. Missing VITE_FIREBASE_API_KEY or VITE_FIREBASE_APP_ID.',
    };
  }

  try {
    const cred = await signInWithPopup(currentAuth, googleProvider);
    const idToken = await cred.user.getIdToken(true);
    return {
      user: cred.user,
      idToken,
      error: null,
    };
  } catch (err: any) {
    if (err.code === 'auth/popup-closed-by-user') {
      return { user: null, idToken: null, error: 'Sign-in window was closed before completing.' };
    }
    if (err.code === 'auth/cancelled-popup-request') {
      return { user: null, idToken: null, error: 'Multiple popup requests detected.' };
    }
    if (err.code === 'auth/unauthorized-domain') {
      return {
        user: null,
        idToken: null,
        error: `Authorized domain missing. Add the current preview domain to Firebase Console > Authentication > Settings > Authorized domains.`,
      };
    }
    return {
      user: null,
      idToken: null,
      error: err.message || 'Failed to authenticate with Google.',
    };
  }
}

export async function signOutFirebase(): Promise<void> {
  const currentAuth = authInstance || auth;
  if (currentAuth) {
    try {
      await signOut(currentAuth);
    } catch (err) {
      console.error('[Firebase] Sign out error:', err);
    }
  }
}

export function onAuthUserChanged(callback: (user: User | null) => void): () => void {
  const currentAuth = authInstance || auth;
  if (!currentAuth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(currentAuth, callback);
}

export interface OwnerVerificationResponse {
  verified: boolean;
  email?: string;
  fullName?: string;
  role?: string;
  designation?: string;
  error?: string;
}

/**
 * Server-Side Owner Authorization Gate
 * Strictly enforces that Super Admin privileges are NEVER granted based on client-side state.
 * Requires verifying the user's ID token against the trusted server endpoint /api/auth/verify-owner.
 */
export async function verifyOwnerWithServer(
  idToken: string
): Promise<OwnerVerificationResponse> {
  try {
    const res = await fetch('/api/auth/verify-owner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (res.status === 404) {
      return {
        verified: false,
        error:
          'Backend verification route (/api/auth/verify-owner) is not reachable. Super Admin access denied.',
      };
    }

    const data: OwnerVerificationResponse = await res.json();
    return data;
  } catch (err: any) {
    return {
      verified: false,
      error: `Server-side verification failed: ${err.message}. Elevated access denied.`,
    };
  }
}
