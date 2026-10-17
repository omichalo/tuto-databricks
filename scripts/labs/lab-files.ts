import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { LabManifest } from '../../src/domain/labs/manifest-schema';
import { labManifestSchema } from '../../src/domain/labs/manifest-schema';

export const ROOT = join(import.meta.dirname, '..', '..');
export const LABS_DIR = join(ROOT, 'labs');

export interface LoadedLab {
  readonly dir: string;
  readonly manifest: LabManifest;
}

export function listLabDirs(): string[] {
  if (!existsSync(LABS_DIR)) return [];
  return readdirSync(LABS_DIR)
    .map((name) => join(LABS_DIR, name))
    .filter((p) => statSync(p).isDirectory())
    .sort();
}

export function loadLab(dir: string): LoadedLab {
  const raw: unknown = parseYaml(readFileSync(join(dir, 'lab.yaml'), 'utf8'));
  const parsed = labManifestSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`${relative(ROOT, dir)}/lab.yaml invalide :\n${parsed.error.message}`);
  }
  return { dir, manifest: parsed.data };
}

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listFiles(p));
    else out.push(p);
  }
  return out;
}

/**
 * Empreinte des artefacts exécutés sur Databricks (sources des notebooks, données, vérification).
 * Le manifeste et les preuves en sont exclus : une preuve ne peut pas invalider sa propre empreinte.
 * Les .ipynb sont générés depuis les .py et ne sont donc pas comptés deux fois.
 */
export function computeArtifactHash(labDir: string): string {
  const hash = createHash('sha256');
  const files = [
    ...listFiles(join(labDir, 'notebooks')).filter((f) => f.endsWith('.py')),
    ...listFiles(join(labDir, 'data')),
    join(labDir, 'verification.server.json'),
  ].filter((f) => existsSync(f));
  for (const file of files) {
    hash.update(relative(labDir, file));
    hash.update('\0');
    hash.update(readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
    hash.update('\0');
  }
  return hash.digest('hex');
}

export function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}
