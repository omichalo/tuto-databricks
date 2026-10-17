/**
 * Vérifie, pour chaque lab, que le générateur est déterministe (deux exécutions identiques) et que
 * data/expected-stats.json correspond au déroulé de référence. `--write` régénère le fichier attendu.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { listLabDirs, loadLab, ROOT } from './lab-files';
import { computeExpectedStats } from './reference-runner';

export async function verifyDatasets(write: boolean): Promise<string[]> {
  const errors: string[] = [];
  for (const dir of listLabDirs()) {
    const { manifest } = loadLab(dir);
    const first = await computeExpectedStats(dir, manifest);
    const second = await computeExpectedStats(dir, manifest);
    if (!isDeepStrictEqual(first, second)) {
      errors.push(`${manifest.id} : le générateur n'est pas déterministe`);
      continue;
    }
    if (first.rows !== manifest.data.rows) {
      errors.push(
        `${manifest.id} : ${JSON.stringify(first.rows)} lignes générées, ${String(manifest.data.rows)} attendues`,
      );
    }
    const expectedPath = join(dir, manifest.data.expectedStats);
    if (write) {
      writeFileSync(expectedPath, `${JSON.stringify(first, null, 2)}\n`);
      console.log(`écrit : ${relative(ROOT, expectedPath)}`);
      continue;
    }
    if (!existsSync(expectedPath)) {
      errors.push(`${manifest.id} : ${manifest.data.expectedStats} absent (lancer avec --write)`);
      continue;
    }
    const committed: unknown = JSON.parse(readFileSync(expectedPath, 'utf8'));
    if (!isDeepStrictEqual(committed, first)) {
      errors.push(
        `${manifest.id} : ${manifest.data.expectedStats} ne correspond plus au générateur`,
      );
    }
  }
  return errors;
}

if (process.argv[1]?.endsWith('verify-datasets.ts') === true) {
  const errors = await verifyDatasets(process.argv.includes('--write'));
  for (const e of errors) console.error(`✗ ${e}`);
  if (errors.length > 0) process.exit(1);
  console.log('✓ jeux de données reproductibles et statistiques attendues à jour');
}
