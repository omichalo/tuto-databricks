import type { LabStatus } from './manifest-schema';
import { LAB_STATUSES } from './manifest-schema';

export function parseLabMinStatus(raw: string | undefined): LabStatus {
  const value = (raw ?? 'validated') as LabStatus;
  return LAB_STATUSES.includes(value) ? value : 'validated';
}

export function isLabStatusVisible(status: LabStatus, minStatus: LabStatus): boolean {
  return LAB_STATUSES.indexOf(status) >= LAB_STATUSES.indexOf(minStatus);
}

/**
 * Statut effectivement affiché. Un TP déclaré "validated" dont les artefacts ont changé depuis la
 * preuve redevient "experimental" : la validation ne couvre que les artefacts exécutés.
 */
export function effectiveLabStatus(
  declared: LabStatus,
  validationArtifactHash: string | null,
  currentArtifactHash: string,
): { status: LabStatus; stale: boolean } {
  if (declared !== 'validated') return { status: declared, stale: false };
  if (validationArtifactHash !== currentArtifactHash)
    return { status: 'experimental', stale: true };
  return { status: 'validated', stale: false };
}
