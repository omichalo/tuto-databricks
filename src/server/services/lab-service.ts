import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { normalizeCheckCode } from '@/domain/labs/check-code';
import type { SelfReportProviderId } from '@/domain/labs/providers';
import { LAB_PROVIDERS } from '@/domain/labs/providers';
import type { LabProgressDoc } from '@/domain/progress/model';
import { applyLabOutcome, applySolutionViewed } from '@/domain/progress/model';
import { LAB_KEYS } from '@/generated/server/keys';
import { db } from '../firebase-admin';
import { ApiError } from '../errors';
import { decode, encode } from '../repositories/firestore-codec';
import { paths } from '../repositories/paths';
import { labMinStatus, visibleLab } from '../visibility';
import { acceptedTermsVersion } from './user-service';

function labOrThrow(labId: string): {
  manifestVersion: string;
  termsNotice: string;
  labId: string;
} {
  const lab = visibleLab(labId);
  const key = LAB_KEYS[labId];
  if (lab === undefined || key === undefined) throw new ApiError('not-found', 'TP inconnu');
  return { labId, manifestVersion: lab.manifest.version, termsNotice: lab.manifest.termsNotice };
}

async function assertProviderAvailable(
  uid: string,
  labId: string,
  provider: SelfReportProviderId,
): Promise<void> {
  const lab = visibleLab(labId);
  if (lab === undefined) throw new ApiError('not-found', 'TP inconnu');
  const availability = LAB_PROVIDERS[provider].isAvailable(lab, {
    signedIn: true,
    isAnonymous: false,
    acceptedFreeEditionTermsVersion: await acceptedTermsVersion(uid),
    minLabStatus: labMinStatus(),
  });
  if (!availability.available)
    throw new ApiError('forbidden', 'Environnement indisponible pour ce TP');
  if (availability.requiresTermsAcceptance) {
    throw new ApiError('forbidden', 'Acceptez d’abord les conditions d’usage de Free Edition');
  }
}

function codeMatches(input: string, expected: string): boolean {
  const left = Buffer.from(normalizeCheckCode(input), 'utf8');
  const right = Buffer.from(expected, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}

export interface LabReportInput {
  readonly provider: SelfReportProviderId;
  readonly completed: boolean;
  readonly checkCode: string | null;
  readonly cleanupConfirmed: boolean;
}

/**
 * Déclaration d'un apprenant. Même si le code de contrôle correspond, le résultat reste
 * `self-reported` : le code est un indice de cohérence, pas une preuve d'exécution.
 */
export async function reportLab(
  uid: string,
  labId: string,
  input: LabReportInput,
  now = Date.now(),
): Promise<{ readonly written: boolean; readonly progress: LabProgressDoc | null }> {
  const lab = labOrThrow(labId);
  await assertProviderAvailable(uid, labId, input.provider);
  const key = LAB_KEYS[labId];
  if (key === undefined) throw new ApiError('not-found', 'TP inconnu');
  const outcome = LAB_PROVIDERS[input.provider].createOutcome({
    labId,
    labVersion: lab.manifestVersion,
    reportedCompleted: input.completed,
    cleanupConfirmed: input.cleanupConfirmed,
    checkCodeMatched: input.checkCode === null ? null : codeMatches(input.checkCode, key.checkCode),
  });
  const ref = paths.labProgress(uid, labId);
  return db().runTransaction(async (tx) => {
    const current = decode<LabProgressDoc>((await tx.get(ref)).data());
    const mutation = applyLabOutcome(current, outcome, now);
    if (!mutation.changed) return { written: false, progress: current };
    tx.set(ref, encode(mutation.next));
    return { written: true, progress: mutation.next };
  });
}

/** Le corrigé n'est servi qu'à un apprenant connecté, et la consultation est enregistrée. */
export async function readSolution(
  uid: string,
  labId: string,
  provider: SelfReportProviderId,
  now = Date.now(),
): Promise<string> {
  const lab = labOrThrow(labId);
  await assertProviderAvailable(uid, labId, provider);
  const key = LAB_KEYS[labId];
  if (key === undefined) throw new ApiError('not-found', 'TP inconnu');
  const ref = paths.labProgress(uid, labId);
  await db().runTransaction(async (tx) => {
    const current = decode<LabProgressDoc>((await tx.get(ref)).data());
    const mutation = applySolutionViewed(
      current,
      { labId, labVersion: lab.manifestVersion, provider, verificationKind: 'self-reported' },
      now,
    );
    if (mutation.changed) tx.set(ref, encode(mutation.next));
  });
  return key.solutionIpynb;
}

export async function readLabProgress(uid: string, labId: string): Promise<LabProgressDoc | null> {
  labOrThrow(labId);
  return decode<LabProgressDoc>((await paths.labProgress(uid, labId).get()).data());
}
