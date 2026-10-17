import { z } from 'zod';

export const LAB_PROVIDER_IDS = [
  'browser',
  'databricks-free-manual',
  'databricks-connected',
  'professional-workspace',
] as const;
export type LabProviderId = (typeof LAB_PROVIDER_IDS)[number];

/**
 * Statut d'un TP dans un environnement réel :
 * - draft : en cours d'écriture, jamais montré en staging ni en production ;
 * - experimental : complet et testé par la CI, mais pas encore exécuté réellement sur l'environnement ;
 * - validated : exécution réelle réussie, prouvée par un fichier de preuve dont l'empreinte correspond.
 */
export const LAB_STATUSES = ['draft', 'experimental', 'validated'] as const;
export type LabStatus = (typeof LAB_STATUSES)[number];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const validationRecordSchema = z.object({
  date: isoDate,
  environment: z.string().min(3),
  runtime: z.string().min(2),
  artifactHash: sha256,
  evidence: z.string().regex(/^validation\/[A-Za-z0-9._-]+\.json$/),
  validatedBy: z.string().min(2),
});
export type ValidationRecord = z.infer<typeof validationRecordSchema>;

const realEnvironmentSchema = z
  .object({
    supported: z.enum(['yes', 'partial', 'no']),
    status: z.enum(LAB_STATUSES),
    requiredFeatures: z.array(z.string()).default([]),
    unavailableFeatures: z.array(z.string()).default([]),
    serverlessConstraints: z.array(z.string()).default([]),
    notes: z.string().optional(),
    validation: validationRecordSchema.nullable(),
  })
  .refine((e) => e.status !== 'validated' || e.validation !== null, {
    message: 'un TP "validated" exige un enregistrement de validation',
  })
  .refine((e) => e.supported !== 'no' || e.status === 'draft', {
    message: 'un environnement non supporté ne peut pas être publié',
  });

export const labManifestSchema = z.object({
  id: slug,
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  title: z.string().min(5),
  summary: z.string().min(20),
  trackId: slug,
  moduleId: slug,
  lessonIds: z.array(slug).min(1),
  objectiveIds: z.array(z.string()).min(1),
  durationMinutes: z.number().int().min(5).max(240),
  environments: z.object({
    browser: z.object({
      supported: z.enum(['yes', 'partial', 'no']),
      exerciseId: slug.optional(),
      notes: z.string().optional(),
    }),
    'databricks-free-manual': realEnvironmentSchema,
    'professional-workspace': realEnvironmentSchema,
  }),
  prerequisites: z.array(z.string()).default([]),
  setup: z.object({
    catalog: z.string().min(3),
    schema: z.string().regex(/^[a-z_][a-z0-9_]*$/),
    fallbackTablePrefix: z.string().regex(/^[a-z_][a-z0-9_]*_$/),
  }),
  resources: z.object({
    compute: z.enum(['serverless-notebook', 'sql-warehouse', 'classic-cluster']),
    estimatedDbuNote: z.string().min(5),
  }),
  data: z.object({
    mode: z.enum(['in-notebook-generator', 'manual-upload']),
    generator: z.string().regex(/^data\/[a-z0-9-]+\.sql$/),
    rows: z.number().int().min(1).max(10_000_000),
    approxSizeMb: z.number().min(0),
    expectedStats: z.string().regex(/^data\/[a-z0-9-]+\.json$/),
    containsPersonalData: z.literal(false),
  }),
  artifacts: z.object({
    exercise: z.string().regex(/^notebooks\/[a-z0-9-]+\.py$/),
    solution: z.string().regex(/^notebooks\/[a-z0-9-]+\.py$/),
    cleanup: z.string().regex(/^notebooks\/[a-z0-9-]+\.py$/),
  }),
  cleanup: z.object({
    objectsCreated: z
      .array(z.string().regex(/^(schema|table|view|volume):[a-z_][a-z0-9_]*$/))
      .min(1),
    verification: z.string().min(10),
  }),
  verification: z.object({
    checkCell: z.string().min(3),
    checkCodePrefix: z.string().regex(/^[A-Z]{2,5}$/),
  }),
  termsNotice: z.string().regex(/^free-edition-v\d+$/),
});
export type LabManifest = z.infer<typeof labManifestSchema>;
export type RealEnvironmentId = 'databricks-free-manual' | 'professional-workspace';

export const validationEvidenceSchema = z.object({
  labId: slug,
  labVersion: z.string(),
  environment: z.string(),
  runtime: z.string(),
  date: isoDate,
  artifactHash: sha256,
  executedBy: z.string().min(2),
  steps: z
    .array(
      z.object({
        name: z.enum(['setup', 'generate', 'exercise', 'verification', 'cleanup', 'cleanup-check']),
        outcome: z.enum(['passed', 'failed']),
        notes: z.string().optional(),
      }),
    )
    .min(6),
  checkCode: z.string(),
  remainingObjectsAfterCleanup: z.number().int().min(0),
});
export type ValidationEvidence = z.infer<typeof validationEvidenceSchema>;
