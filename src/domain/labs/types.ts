import type { Locale } from '../i18n/locales';
import type { LabManifest, LabProviderId, LabStatus, RealEnvironmentId } from './manifest-schema';

export type VerificationKind = 'automatic-formative' | 'self-reported' | 'remote-verified';

/** Statut d'un environnement réel, calculé au build à partir du manifeste et des artefacts. */
export interface EnvironmentStatus {
  readonly declared: LabStatus;
  readonly effective: LabStatus;
  readonly stale: boolean;
  readonly validatedOn: string | null;
  readonly validatedEnvironment: string | null;
}

export interface LabArtifactRef {
  readonly kind: 'exercise-notebook' | 'exercise-source' | 'cleanup-notebook' | 'cleanup-source';
  readonly fileName: string;
  readonly href: string;
  readonly sha256: string;
}

/** Vue publique d'un lab : jamais de corrigé ni de code de contrôle attendu. */
export interface PublicLab {
  readonly manifest: LabManifest;
  readonly artifactHash: string;
  readonly status: Readonly<Record<RealEnvironmentId, EnvironmentStatus>>;
  readonly artifacts: readonly LabArtifactRef[];
  readonly readmeFr: string;
  readonly expectedResults: Readonly<Record<string, unknown>>;
}

export interface LearnerContext {
  readonly signedIn: boolean;
  readonly isAnonymous: boolean;
  readonly acceptedFreeEditionTermsVersion: string | null;
  readonly minLabStatus: LabStatus;
}

export type UnavailableReason =
  | 'environment-not-supported'
  | 'lab-not-visible-in-this-environment'
  | 'not-implemented'
  | 'no-browser-exercise';

export type Availability =
  | { readonly available: true; readonly requiresTermsAcceptance: boolean }
  | { readonly available: false; readonly reason: UnavailableReason };

export interface LabInstructions {
  readonly heading: string;
  readonly steps: readonly string[];
  readonly warnings: readonly string[];
}

export interface LabOutcomeInput {
  readonly labId: string;
  readonly labVersion: string;
  readonly reportedCompleted: boolean;
  readonly cleanupConfirmed: boolean;
  readonly checkCodeMatched: boolean | null;
}

/** Enregistrement de résultat produit par un fournisseur, prêt à être persisté côté serveur. */
export interface LabOutcome {
  readonly labId: string;
  readonly labVersion: string;
  readonly provider: LabProviderId;
  readonly verificationKind: VerificationKind;
  readonly status: 'started' | 'reported-completed';
  readonly checkCodeMatched: boolean | null;
  readonly cleanupConfirmed: boolean;
}

export interface LabProvider {
  readonly id: LabProviderId;
  readonly verification: VerificationKind;
  isAvailable(lab: PublicLab, ctx: LearnerContext): Availability;
  getInstructions(lab: PublicLab, locale: Locale): LabInstructions;
  getArtifacts(lab: PublicLab): readonly LabArtifactRef[];
  createOutcome(input: LabOutcomeInput): LabOutcome;
}
