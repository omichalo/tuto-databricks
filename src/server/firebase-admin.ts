import 'server-only';
import type { App } from 'firebase-admin/app';
import { getApps, initializeApp } from 'firebase-admin/app';
import type { AppCheck } from 'firebase-admin/app-check';
import { getAppCheck } from 'firebase-admin/app-check';
import type { Auth } from 'firebase-admin/auth';
import { getAuth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { serverEnv, usesEmulators } from './env';

function adminApp(): App {
  const existing = getApps()[0];
  if (existing !== undefined) return existing;
  const env = serverEnv();
  if (usesEmulators(env)) {
    // Émulateurs : projet de démonstration, aucun identifiant réel.
    return initializeApp({ projectId: env.GCLOUD_PROJECT ?? 'demo-tuto-databricks' });
  }
  // App Hosting fournit les identifiants par défaut (compte de service du backend).
  return initializeApp();
}

let firestore: Firestore | null = null;

export function db(): Firestore {
  if (firestore === null) {
    firestore = getFirestore(adminApp());
    firestore.settings({ ignoreUndefinedProperties: false });
  }
  return firestore;
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}

export function adminAppCheck(): AppCheck {
  return getAppCheck(adminApp());
}
