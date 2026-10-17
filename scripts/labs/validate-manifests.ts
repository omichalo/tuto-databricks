import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { validationEvidenceSchema } from '../../src/domain/labs/manifest-schema';
import { computeArtifactHash, listLabDirs, loadLab, ROOT } from './lab-files';

const featureFileSchema = z.object({
  reviewedAt: z.string(),
  features: z.record(
    z.string(),
    z.object({
      status: z.enum(['confirmed', 'unknown', 'unavailable']),
      source: z.url(),
      note: z.string(),
    }),
  ),
});

function knownObjectives(): Set<string> {
  const ids = new Set<string>();
  const dir = join(ROOT, 'content', 'objectives');
  for (const file of ['databricks-sql-delta.yaml']) {
    const path = join(dir, file);
    if (!existsSync(path)) continue;
    const raw = parseYaml(readFileSync(path, 'utf8')) as { objectives?: { id: string }[] };
    for (const o of raw.objectives ?? []) ids.add(o.id);
  }
  return ids;
}

export function validateManifests(): string[] {
  const errors: string[] = [];
  const features = featureFileSchema.parse(
    JSON.parse(readFileSync(join(ROOT, 'config', 'free-edition-features.json'), 'utf8')),
  ).features;
  const objectives = knownObjectives();

  for (const dir of listLabDirs()) {
    let lab;
    try {
      lab = loadLab(dir);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      continue;
    }
    const m = lab.manifest;
    const id = m.id;
    if (!dir.endsWith(`/${id}`)) errors.push(`${id} : le dossier doit porter l'identifiant du lab`);
    for (const objectiveId of m.objectiveIds) {
      if (!objectives.has(objectiveId)) errors.push(`${id} : objectif inconnu ${objectiveId}`);
    }
    for (const path of [
      m.data.generator,
      m.data.expectedStats,
      m.artifacts.exercise,
      m.artifacts.solution,
      m.artifacts.cleanup,
    ]) {
      if (!existsSync(join(dir, path))) errors.push(`${id} : fichier manquant ${path}`);
    }
    if (!existsSync(join(dir, 'README.fr.md'))) errors.push(`${id} : README.fr.md manquant`);

    const free = m.environments['databricks-free-manual'];
    for (const feature of free.requiredFeatures) {
      const entry = features[feature];
      if (entry === undefined) {
        errors.push(
          `${id} : fonctionnalité Free Edition inconnue "${feature}" (config/free-edition-features.json)`,
        );
      } else if (free.supported === 'yes' && entry.status !== 'confirmed') {
        errors.push(
          `${id} : Free Edition déclaré "yes" alors que "${feature}" est "${entry.status}" (ne jamais supposer une fonctionnalité disponible)`,
        );
      }
    }

    const currentHash = computeArtifactHash(dir);
    for (const envId of ['databricks-free-manual', 'professional-workspace'] as const) {
      const env = m.environments[envId];
      if (env.status !== 'validated') continue;
      const record = env.validation;
      if (record === null) {
        errors.push(`${id}/${envId} : "validated" sans enregistrement de validation`);
        continue;
      }
      const evidencePath = join(dir, record.evidence);
      if (!existsSync(evidencePath)) {
        errors.push(`${id}/${envId} : preuve ${record.evidence} introuvable`);
        continue;
      }
      const evidence = validationEvidenceSchema.safeParse(
        JSON.parse(readFileSync(evidencePath, 'utf8')),
      );
      if (!evidence.success) {
        errors.push(`${id}/${envId} : preuve invalide : ${evidence.error.message}`);
        continue;
      }
      const e = evidence.data;
      if (e.artifactHash !== record.artifactHash)
        errors.push(`${id}/${envId} : empreinte de la preuve ≠ manifeste`);
      if (e.labId !== id || e.labVersion !== m.version)
        errors.push(`${id}/${envId} : preuve d'un autre lab ou d'une autre version`);
      if (e.steps.some((s) => s.outcome !== 'passed'))
        errors.push(`${id}/${envId} : la preuve contient une étape en échec`);
      if (e.remainingObjectsAfterCleanup !== 0)
        errors.push(`${id}/${envId} : nettoyage incomplet dans la preuve`);
      if (record.artifactHash !== currentHash) {
        errors.push(
          `${id}/${envId} : artefacts modifiés depuis la validation (empreinte ${currentHash.slice(0, 12)}…) : repasser en "experimental" ou revalider`,
        );
      }
    }
  }
  return errors;
}
