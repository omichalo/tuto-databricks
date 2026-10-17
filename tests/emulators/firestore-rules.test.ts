import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..', '..');
const [host = '127.0.0.1', port = '8080'] = (
  process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
).split(':');

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-tuto-databricks',
    firestore: {
      rules: readFileSync(join(ROOT, 'firestore.rules'), 'utf8'),
      host,
      port: Number(port),
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/alice'), { provider: 'anonymous' });
    await setDoc(doc(db, 'users/alice/lessonProgress/t__l'), { status: 'completed' });
    await setDoc(doc(db, 'users/alice/labProgress/lab'), { verificationKind: 'self-reported' });
    await setDoc(doc(db, 'users/bob'), { provider: 'google.com' });
    await setDoc(doc(db, 'rateLimits/alice_x_0'), { count: 1 });
  });
});

const SUBCOLLECTIONS = ['lessonProgress', 'trackProgress', 'exerciseResults', 'labProgress'];

describe('règles Firestore', () => {
  it('un utilisateur lit son profil et sa progression', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(db, 'users/alice')));
    for (const sub of SUBCOLLECTIONS)
      await assertSucceeds(getDocs(collection(db, `users/alice/${sub}`)));
  });

  it('un utilisateur ne lit pas les données d’un autre', async () => {
    const db = env.authenticatedContext('bob').firestore();
    await assertFails(getDoc(doc(db, 'users/alice')));
    await assertFails(getDoc(doc(db, 'users/alice/lessonProgress/t__l')));
    await assertFails(getDocs(collection(db, 'users/alice/labProgress')));
  });

  it('un visiteur non authentifié ne lit rien', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'users/alice')));
    await assertFails(getDocs(collection(db, 'users')));
  });

  it('personne ne liste la collection des utilisateurs', async () => {
    await assertFails(getDocs(collection(env.authenticatedContext('alice').firestore(), 'users')));
  });

  it('aucune écriture client, même sur ses propres documents', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'users/alice'), { provider: 'google.com' }));
    await assertFails(updateDoc(doc(db, 'users/alice'), { provider: 'x' }));
    await assertFails(deleteDoc(doc(db, 'users/alice')));
    for (const sub of SUBCOLLECTIONS) {
      await assertFails(
        setDoc(doc(db, `users/alice/${sub}/forged`), { verificationKind: 'remote-verified' }),
      );
    }
    await assertFails(
      updateDoc(doc(db, 'users/alice/labProgress/lab'), { verificationKind: 'remote-verified' }),
    );
  });

  it('les quotas et les collections non listées sont inaccessibles', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(getDoc(doc(db, 'rateLimits/alice_x_0')));
    await assertFails(setDoc(doc(db, 'rateLimits/alice_x_0'), { count: 0 }));
    await assertFails(getDoc(doc(db, 'users/alice/secrets/x')));
    await assertFails(setDoc(doc(db, 'anything/x'), { a: 1 }));
  });
});
