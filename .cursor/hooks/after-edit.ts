/**
 * afterFileEdit : formate le fichier modifié avec Prettier et signale immédiatement une violation
 * d'invariant (TP « validated » sans preuve, correcteur SQL activé). Le blocage effectif a lieu
 * avant `git commit` (guard-shell.ts) et en CI.
 */
import { execFileSync } from 'node:child_process';
import { readInput, stringField } from './lib';

const file = stringField(readInput(), 'file_path', 'path');

if (/\.(tsx?|mjs|json|ya?ml|mdx?|css)$/.test(file) && !file.includes('node_modules')) {
  try {
    execFileSync('npx', ['--no-install', 'prettier', '--write', '--log-level=silent', file], {
      stdio: 'ignore',
    });
  } catch {
    // fichier ignoré par .prettierignore ou syntaxe en cours d'écriture : rien à faire
  }
}

if (/(lab\.ya?ml|apphosting.*\.ya?ml|\.env\.example|src\/server\/env\.ts)$/.test(file)) {
  try {
    execFileSync('npx', ['--no-install', 'tsx', 'scripts/guards/invariants.ts'], { stdio: 'pipe' });
  } catch (error) {
    const stderr =
      typeof error === 'object' && error !== null && 'stderr' in error ? String(error.stderr) : '';
    process.stderr.write(`Invariant violé après modification de ${file} :\n${stderr}`);
  }
}
process.stdout.write('{}');
