import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
import { getApps, initializeApp } from 'firebase/app';
import type { AppCheck } from 'firebase/app-check';
import { getToken, initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import type { Auth } from 'firebase/auth';
import { connectAuthEmulator, getAuth } from 'firebase/auth';

const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY ?? '';

function explicitConfig(): FirebaseOptions | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (apiKey === undefined || projectId === undefined) return null;
  return {
    apiKey,
    projectId,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? `${projectId}.firebaseapp.com`,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? 'unset',
  };
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let appCheck: AppCheck | null = null;

export function clientApp(): FirebaseApp {
  if (app !== null) return app;
  const existing = getApps()[0];
  if (existing !== undefined) {
    app = existing;
    return app;
  }
  const config = explicitConfig();
  // Sans configuration explicite, App Hosting injecte la configuration web au build.
  app = config === null ? initializeApp() : initializeApp(config);
  if (!useEmulators && recaptchaSiteKey !== '') {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
  return app;
}

export function clientAuth(): Auth {
  if (auth !== null) return auth;
  auth = getAuth(clientApp());
  if (useEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  return auth;
}

/** Jeton App Check à joindre aux appels API ; null si App Check n'est pas configuré. */
export async function appCheckToken(): Promise<string | null> {
  clientApp();
  if (appCheck === null) return null;
  try {
    return (await getToken(appCheck, false)).token;
  } catch {
    return null;
  }
}
