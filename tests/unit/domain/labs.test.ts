import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHECK_CODE_MODULUS, computeCheckCode, normalizeCheckCode } from '@/domain/labs/check-code';
import { labManifestSchema } from '@/domain/labs/manifest-schema';
import {
  databricksConnectedProvider,
  databricksFreeManualProvider,
  LAB_PROVIDERS,
  professionalWorkspaceProvider,
  SELF_REPORT_PROVIDERS,
} from '@/domain/labs/providers';
import type { LearnerContext, PublicLab } from '@/domain/labs/types';
import { LABS } from '@/generated/content';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const found = LABS.find((l) => l.manifest.id === 'delta-first-table');
if (found === undefined) throw new Error('lab delta-first-table absent du contenu généré');
const lab: PublicLab = found;

const ctx = (overrides: Partial<LearnerContext> = {}): LearnerContext => ({
  signedIn: true,
  isAnonymous: false,
  acceptedFreeEditionTermsVersion: null,
  minLabStatus: 'experimental',
  ...overrides,
});

describe('code de contrôle', () => {
  it('reproduit le code attendu du TP pilote à partir des statistiques de référence', () => {
    const stats = JSON.parse(
      readFileSync(join(ROOT, 'labs/delta-first-table/data/expected-stats.json'), 'utf8'),
    ) as Record<string, number>;
    const code = computeCheckCode('DFT', {
      deliveredRevenueCents: stats.deliveredRevenueCents ?? -1,
      pendingAfterUpdate: stats.pendingAfterUpdate ?? -1,
      cancelledAfterUpdate: stats.cancelledAfterUpdate ?? -1,
    });
    expect(code).toBe('DFT-43854');
  });

  it('reste synchronisé avec la formule Python de la cellule de vérification', () => {
    const source = readFileSync(join(ROOT, 'labs/delta-first-table/notebooks/source.py'), 'utf8');
    expect(source).toContain(`CHECK_MODULUS = ${String(CHECK_CODE_MODULUS)}`);
    expect(source).toContain(
      '(delivered + 7 * pending_after + 13 * cancelled_after) % CHECK_MODULUS',
    );
    expect(source).toContain('{code_value:05d}');
  });

  it('normalise la saisie de l’apprenant', () => {
    expect(normalizeCheckCode('  dft - 43854 ')).toBe('DFT-43854');
  });
});

describe('fournisseurs de TP', () => {
  it('ne produit jamais de résultat vérifié à partir d’une déclaration', () => {
    for (const id of SELF_REPORT_PROVIDERS) {
      const outcome = LAB_PROVIDERS[id].createOutcome({
        labId: 'x',
        labVersion: '1.0.0',
        reportedCompleted: true,
        cleanupConfirmed: true,
        checkCodeMatched: true,
      });
      expect(outcome.verificationKind).toBe('self-reported');
    }
  });

  it('ignore le code et le nettoyage tant que le TP n’est pas déclaré terminé', () => {
    const outcome = databricksFreeManualProvider.createOutcome({
      labId: 'x',
      labVersion: '1.0.0',
      reportedCompleted: false,
      cleanupConfirmed: true,
      checkCodeMatched: true,
    });
    expect(outcome).toMatchObject({
      status: 'started',
      checkCodeMatched: null,
      cleanupConfirmed: false,
    });
  });

  it('garde le fournisseur connecté indisponible et sans résultat possible', () => {
    expect(databricksConnectedProvider.isAvailable(lab, ctx())).toEqual({
      available: false,
      reason: 'not-implemented',
    });
    expect(() =>
      databricksConnectedProvider.createOutcome({
        labId: 'x',
        labVersion: '1',
        reportedCompleted: true,
        cleanupConfirmed: true,
        checkCodeMatched: true,
      }),
    ).toThrow();
  });

  it('masque un TP expérimental quand le seuil est validated (production)', () => {
    expect(
      databricksFreeManualProvider.isAvailable(lab, ctx({ minLabStatus: 'validated' })),
    ).toEqual({
      available: false,
      reason: 'lab-not-visible-in-this-environment',
    });
    expect(
      professionalWorkspaceProvider.isAvailable(lab, ctx({ minLabStatus: 'validated' })).available,
    ).toBe(false);
  });

  it('exige l’acceptation de la version courante des conditions Free Edition', () => {
    expect(databricksFreeManualProvider.isAvailable(lab, ctx())).toEqual({
      available: true,
      requiresTermsAcceptance: true,
    });
    expect(
      databricksFreeManualProvider.isAvailable(
        lab,
        ctx({ acceptedFreeEditionTermsVersion: lab.manifest.termsNotice }),
      ),
    ).toEqual({ available: true, requiresTermsAcceptance: false });
    expect(professionalWorkspaceProvider.isAvailable(lab, ctx())).toEqual({
      available: true,
      requiresTermsAcceptance: false,
    });
  });

  it('signale un TP non validé dans les consignes Free Edition', () => {
    const instructions = databricksFreeManualProvider.getInstructions(lab, 'fr');
    expect(instructions.warnings.join(' ')).toMatch(/expérimental/i);
  });
});

describe('manifeste de TP', () => {
  const manifest = lab.manifest;

  it('refuse un statut validated sans enregistrement de validation', () => {
    const invalid = {
      ...manifest,
      environments: {
        ...manifest.environments,
        'databricks-free-manual': {
          ...manifest.environments['databricks-free-manual'],
          status: 'validated',
          validation: null,
        },
      },
    };
    expect(labManifestSchema.safeParse(invalid).success).toBe(false);
  });

  it('refuse des données personnelles', () => {
    const invalid = { ...manifest, data: { ...manifest.data, containsPersonalData: true } };
    expect(labManifestSchema.safeParse(invalid).success).toBe(false);
  });

  it('le TP pilote est expérimental et non validé tant qu’aucune exécution réelle n’est prouvée', () => {
    expect(lab.status['databricks-free-manual'].effective).toBe('experimental');
    expect(manifest.environments['databricks-free-manual'].validation).toBeNull();
  });
});
