import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { FREE_EDITION_TERMS_VERSION } from '@/domain/labs/providers';
import { db } from '../firebase-admin';
import { ApiError } from '../errors';
import { paths } from '../repositories/paths';
import type { SessionUser } from '../session';

export interface UserProfileView {
  readonly uid: string;
  readonly isAnonymous: boolean;
  readonly provider: string;
  readonly displayName: string | null;
  readonly acceptedFreeEditionTermsVersion: string | null;
}

/** Crée le profil au premier échange de session ; aucune écriture s'il existe déjà. */
export async function ensureProfile(user: SessionUser): Promise<void> {
  const ref = paths.user(user.uid);
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const provider: unknown = snap.get('provider');
    if (snap.exists && provider === user.provider) return;
    const createdAt: unknown = snap.get('createdAt');
    tx.set(
      ref,
      {
        provider: user.provider,
        createdAt:
          snap.exists && createdAt !== undefined ? createdAt : FieldValue.serverTimestamp(),
        schemaVersion: 1,
      },
      { merge: true },
    );
  });
}

export async function acceptedTermsVersion(uid: string): Promise<string | null> {
  const snap = await paths.user(uid).get();
  const value: unknown = snap.get('acknowledgements.freeEditionTerms.version');
  return typeof value === 'string' ? value : null;
}

export async function readProfile(user: SessionUser): Promise<UserProfileView> {
  return {
    uid: user.uid,
    isAnonymous: user.isAnonymous,
    provider: user.provider,
    displayName: user.displayName,
    acceptedFreeEditionTermsVersion: await acceptedTermsVersion(user.uid),
  };
}

/**
 * Prise de connaissance des conditions Free Edition (usage personnel, non commercial, compte
 * propre, nettoyage). Versionnée : un changement de version redemande l'accord.
 */
export async function acknowledgeFreeEditionTerms(
  uid: string,
  version: string,
  now = Date.now(),
): Promise<{ written: boolean }> {
  if (version !== FREE_EDITION_TERMS_VERSION)
    throw new ApiError('conflict', 'Version des conditions obsolète');
  const ref = paths.user(uid);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current: unknown = snap.get('acknowledgements.freeEditionTerms.version');
    if (current === version) return { written: false };
    tx.set(
      ref,
      {
        acknowledgements: { freeEditionTerms: { version, acceptedAt: Timestamp.fromMillis(now) } },
      },
      { merge: true },
    );
    return { written: true };
  });
}
