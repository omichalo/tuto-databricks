/**
 * Invariants non négociables du dépôt, vérifiés par `npm run guards`, par le hook Cursor avant
 * `git commit` et par la CI :
 * - un TP n'est « validated » qu'avec une preuve d'exécution réelle conforme (validateManifests) ;
 * - le correcteur SQL serveur reste désactivé partout (SQL_SERVER_GRADING_ENABLED=false) ;
 * - aucun workflow n'automatise de traitement sur Databricks Free Edition.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateManifests } from '../labs/validate-manifests';

const ROOT = join(import.meta.dirname, '..', '..');

function read(path: string): string | null {
  const full = join(ROOT, path);
  return existsSync(full) ? readFileSync(full, 'utf8') : null;
}

export function graderFlagViolations(): string[] {
  const errors: string[] = [];
  const files = [
    '.env.example',
    ...readdirSync(ROOT).filter((f) => /^apphosting(\.[a-z]+)?\.yaml$/.test(f)),
  ];
  for (const file of files) {
    const text = read(file);
    if (text === null) continue;
    const enabled =
      /SQL_SERVER_GRADING_ENABLED\s*=\s*["']?true/i.test(text) ||
      /variable:\s*SQL_SERVER_GRADING_ENABLED\s*\n\s*value:\s*["']?true/i.test(text);
    if (enabled)
      errors.push(`${file} : SQL_SERVER_GRADING_ENABLED doit rester "false" (ADR requis)`);
  }
  const env = read('src/server/env.ts');
  if (env !== null && !env.includes("SQL_SERVER_GRADING_ENABLED: z.literal('false')")) {
    errors.push('src/server/env.ts : le schéma doit imposer SQL_SERVER_GRADING_ENABLED = "false"');
  }
  return errors;
}

export function freeEditionAutomationViolations(): string[] {
  const dir = join(ROOT, '.github', 'workflows');
  if (!existsSync(dir)) return [];
  const errors: string[] = [];
  for (const file of readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
    const text = readFileSync(join(dir, file), 'utf8');
    if (/databricks\s+(bundle|jobs|workspace|clusters|api)\b|DATABRICKS_(HOST|TOKEN)/.test(text)) {
      errors.push(
        `.github/workflows/${file} : automatisation Databricks interdite tant que les conditions d'usage de Free Edition n'ont pas été validées (docs/status.md, blocages)`,
      );
    }
  }
  return errors;
}

export function allInvariantViolations(): string[] {
  return [...validateManifests(), ...graderFlagViolations(), ...freeEditionAutomationViolations()];
}

if (import.meta.url === `file://${process.argv[1] ?? ''}`) {
  const errors = allInvariantViolations();
  if (errors.length > 0) {
    for (const e of errors) console.error(`✗ ${e}`);
    process.exit(1);
  }
  console.log('✓ invariants du dépôt respectés');
}
