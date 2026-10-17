import type { LabProviderId, RealEnvironmentId } from './manifest-schema';
import { isLabStatusVisible } from './status';
import type {
  Availability,
  LabInstructions,
  LabOutcome,
  LabOutcomeInput,
  LabProvider,
  LearnerContext,
  PublicLab,
} from './types';

export const FREE_EDITION_TERMS_VERSION = 'free-edition-v1';

function realEnvironmentAvailability(
  lab: PublicLab,
  env: RealEnvironmentId,
  ctx: LearnerContext,
): Availability {
  const declared = lab.manifest.environments[env];
  if (declared.supported === 'no') return { available: false, reason: 'environment-not-supported' };
  if (!isLabStatusVisible(lab.status[env].effective, ctx.minLabStatus)) {
    return { available: false, reason: 'lab-not-visible-in-this-environment' };
  }
  return {
    available: true,
    requiresTermsAcceptance:
      env === 'databricks-free-manual' &&
      ctx.acceptedFreeEditionTermsVersion !== lab.manifest.termsNotice,
  };
}

function selfReportedOutcome(provider: LabProviderId, input: LabOutcomeInput): LabOutcome {
  return {
    labId: input.labId,
    labVersion: input.labVersion,
    provider,
    // Une déclaration de l'apprenant reste une déclaration, même si le code de contrôle correspond.
    verificationKind: 'self-reported',
    status: input.reportedCompleted ? 'reported-completed' : 'started',
    checkCodeMatched: input.reportedCompleted ? input.checkCodeMatched : null,
    cleanupConfirmed: input.reportedCompleted && input.cleanupConfirmed,
  };
}

export const browserProvider: LabProvider = {
  id: 'browser',
  verification: 'automatic-formative',
  isAvailable(lab) {
    const env = lab.manifest.environments.browser;
    if (env.supported === 'no' || env.exerciseId === undefined) {
      return { available: false, reason: 'no-browser-exercise' };
    }
    return { available: true, requiresTermsAcceptance: false };
  },
  getInstructions(lab): LabInstructions {
    return {
      heading: 'Essayer dans le navigateur',
      steps: [
        'Le moteur SQL DuckDB-Wasm se charge dans votre navigateur : aucun compte ni installation.',
        'Les données sont générées localement par le même générateur que le TP Free Edition, sur un volume réduit.',
        'La vérification compare l’empreinte de votre résultat à celle de la solution : elle est formative.',
      ],
      warnings:
        lab.manifest.environments.browser.supported === 'partial'
          ? [
              lab.manifest.environments.browser.notes ??
                'Une partie seulement du TP est reproductible dans le navigateur.',
            ]
          : [],
    };
  },
  getArtifacts() {
    return [];
  },
  createOutcome(input) {
    return {
      labId: input.labId,
      labVersion: input.labVersion,
      provider: 'browser',
      verificationKind: 'automatic-formative',
      status: input.reportedCompleted ? 'reported-completed' : 'started',
      checkCodeMatched: null,
      cleanupConfirmed: false,
    };
  },
};

export const databricksFreeManualProvider: LabProvider = {
  id: 'databricks-free-manual',
  verification: 'self-reported',
  isAvailable(lab, ctx) {
    return realEnvironmentAvailability(lab, 'databricks-free-manual', ctx);
  },
  getInstructions(lab): LabInstructions {
    const status = lab.status['databricks-free-manual'];
    const warnings = [
      'Utilisez votre propre compte Databricks Free Edition, à titre personnel et non commercial. Ne partagez pas de compte.',
      'Free Edition applique des quotas quotidiens : si le calcul s’arrête, reprenez le lendemain.',
      'Exécutez toujours le notebook de nettoyage à la fin.',
    ];
    if (status.effective !== 'validated') {
      warnings.unshift(
        'TP expérimental : il n’a pas encore été validé par une exécution réelle sur Free Edition.',
      );
    }
    return {
      heading: 'Réaliser le TP sur Databricks Free Edition',
      steps: [
        'Téléchargez le notebook d’exercice (.ipynb).',
        'Dans votre workspace : Workspace > Import, puis choisissez le fichier.',
        'Attachez le notebook au calcul serverless et exécutez les cellules dans l’ordre.',
        'Copiez le code de contrôle affiché par la cellule de vérification.',
        'Exécutez le notebook de nettoyage, puis déclarez votre résultat ci-dessous.',
      ],
      warnings,
    };
  },
  getArtifacts(lab) {
    return lab.artifacts;
  },
  createOutcome(input) {
    return selfReportedOutcome('databricks-free-manual', input);
  },
};

export const professionalWorkspaceProvider: LabProvider = {
  id: 'professional-workspace',
  verification: 'self-reported',
  isAvailable(lab, ctx) {
    return realEnvironmentAvailability(lab, 'professional-workspace', ctx);
  },
  getInstructions(): LabInstructions {
    return {
      heading: 'Utiliser un workspace professionnel',
      steps: [
        'Vérifiez auprès de votre organisation que vous êtes autorisé à créer un schéma de test.',
        'Importez le notebook d’exercice et attachez-le à un calcul serverless ou à un cluster Unity Catalog.',
        'Renseignez le widget « catalog » avec un catalogue où vous avez les droits CREATE SCHEMA.',
        'Exécutez le notebook de nettoyage à la fin : le calcul est facturé par votre organisation.',
      ],
      warnings: [
        'Pour un usage professionnel ou commercial, n’utilisez pas Free Edition : utilisez le workspace de votre organisation ou un essai Databricks.',
      ],
    };
  },
  getArtifacts(lab) {
    return lab.artifacts;
  },
  createOutcome(input) {
    return selfReportedOutcome('professional-workspace', input);
  },
};

/** Exécution distante future (OAuth par apprenant) : interface seule, toujours indisponible. */
export const databricksConnectedProvider: LabProvider = {
  id: 'databricks-connected',
  verification: 'remote-verified',
  isAvailable() {
    return { available: false, reason: 'not-implemented' };
  },
  getInstructions() {
    return { heading: 'Workspace connecté (bientôt)', steps: [], warnings: [] };
  },
  getArtifacts() {
    return [];
  },
  createOutcome() {
    throw new Error(
      'databricks-connected n’est pas implémenté : aucun résultat ne peut être produit.',
    );
  },
};

export const LAB_PROVIDERS: Readonly<Record<LabProviderId, LabProvider>> = {
  browser: browserProvider,
  'databricks-free-manual': databricksFreeManualProvider,
  'professional-workspace': professionalWorkspaceProvider,
  'databricks-connected': databricksConnectedProvider,
};

/** Fournisseurs qu'un apprenant peut déclarer via l'API (jamais 'browser' ni 'databricks-connected'). */
export const SELF_REPORT_PROVIDERS = ['databricks-free-manual', 'professional-workspace'] as const;
export type SelfReportProviderId = (typeof SELF_REPORT_PROVIDERS)[number];
