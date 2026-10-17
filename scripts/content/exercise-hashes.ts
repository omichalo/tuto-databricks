/**
 * Recalcule l'empreinte attendue de chaque exercice en exécutant sa solution dans DuckDB et vérifie
 * la forme déclarée. `--write` met à jour expectedHash dans exercise.yaml.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { exerciseFileSchema } from '../../src/domain/content/schema';
import { ROOT } from '../labs/lab-files';
import { solutionFingerprint } from './exercise-runner';

export async function checkExercises(write: boolean): Promise<string[]> {
  const errors: string[] = [];
  const dir = join(ROOT, 'content', 'exercises');
  for (const id of readdirSync(dir).sort()) {
    const path = join(dir, id, 'exercise.yaml');
    const text = readFileSync(path, 'utf8');
    const exercise = exerciseFileSchema.parse(parseYaml(text));
    const { hash, result } = await solutionFingerprint(exercise);
    if (result.rows.length !== exercise.expectedShape.rowCount) {
      errors.push(
        `${id} : la solution renvoie ${String(result.rows.length)} lignes, ${String(exercise.expectedShape.rowCount)} déclarées`,
      );
    }
    if (result.columns.join(',') !== exercise.expectedShape.columns.join(',')) {
      errors.push(
        `${id} : colonnes ${result.columns.join(',')} ≠ ${exercise.expectedShape.columns.join(',')}`,
      );
    }
    if (write) {
      writeFileSync(path, text.replace(/^expectedHash: .*$/m, `expectedHash: '${hash}'`));
      console.log(`${id} : ${hash}`);
    } else if (hash !== exercise.expectedHash) {
      errors.push(
        `${id} : expectedHash périmé (npx tsx scripts/content/exercise-hashes.ts --write)`,
      );
    }
  }
  return errors;
}

if (process.argv[1]?.endsWith('exercise-hashes.ts') === true) {
  const errors = await checkExercises(process.argv.includes('--write'));
  for (const e of errors) console.error(`✗ ${e}`);
  if (errors.length > 0) process.exit(1);
  console.log('✓ empreintes des exercices à jour');
}
