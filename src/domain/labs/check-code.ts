/**
 * Statistiques lues par la cellule de vérification du notebook après les étapes de l'exercice.
 * La même formule est implémentée en Python dans la cellule de vérification ; un test garantit
 * que le notebook et cette fonction restent synchronisés.
 */
export interface LabCheckStats {
  readonly deliveredRevenueCents: number;
  readonly pendingAfterUpdate: number;
  readonly cancelledAfterUpdate: number;
}

export const CHECK_CODE_MODULUS = 99_991;

export function computeCheckCode(prefix: string, stats: LabCheckStats): string {
  const raw =
    stats.deliveredRevenueCents + 7 * stats.pendingAfterUpdate + 13 * stats.cancelledAfterUpdate;
  const value = raw % CHECK_CODE_MODULUS;
  return `${prefix}-${value.toString().padStart(5, '0')}`;
}

/** Normalise une saisie d'apprenant (espaces, casse) avant comparaison. */
export function normalizeCheckCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '');
}
