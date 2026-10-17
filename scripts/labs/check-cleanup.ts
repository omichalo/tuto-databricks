import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { listLabDirs, loadLab } from './lab-files';

/**
 * Vérifie statiquement que tout objet créé par le corrigé est déclaré dans le manifeste
 * et supprimé par le notebook de nettoyage, qui doit se terminer par un contrôle à zéro objet.
 */
export function checkCleanup(): string[] {
  const errors: string[] = [];
  for (const dir of listLabDirs()) {
    const { manifest } = loadLab(dir);
    const id = manifest.id;
    const solution = readFileSync(join(dir, manifest.artifacts.solution), 'utf8');
    const cleanup = readFileSync(join(dir, manifest.artifacts.cleanup), 'utf8');
    const declared = new Set(manifest.cleanup.objectsCreated);

    const createdTables = [
      ...solution.matchAll(/^T_[A-Z_]+ = f".*\{table_prefix\}([a-z_]+)`"$/gm),
    ].map((m) => m[1] ?? '');
    if (createdTables.length === 0) errors.push(`${id} : aucune table détectée dans le corrigé`);
    for (const table of createdTables) {
      if (!declared.has(`table:${table}`))
        errors.push(`${id} : table ${table} créée mais absente de cleanup.objectsCreated`);
    }
    if (/CREATE SCHEMA/i.test(solution) && !declared.has(`schema:${manifest.setup.schema}`)) {
      errors.push(`${id} : schéma créé mais absent de cleanup.objectsCreated`);
    }

    const labTables = /^LAB_TABLES = \[([^\]]*)\]$/m.exec(cleanup)?.[1] ?? '';
    for (const entry of declared) {
      const [kind, name = ''] = entry.split(':');
      if (kind === 'table' && !labTables.includes(`"${name}"`)) {
        errors.push(`${id} : le nettoyage ne supprime pas la table ${name}`);
      }
      if (kind === 'schema' && !cleanup.includes('DROP SCHEMA IF EXISTS')) {
        errors.push(`${id} : le nettoyage ne supprime pas le schéma ${name}`);
      }
    }
    if (!cleanup.includes(`"${manifest.setup.schema}"`)) {
      errors.push(
        `${id} : le nettoyage n'utilise pas le schéma ${manifest.setup.schema} du manifeste`,
      );
    }
    if (!cleanup.includes(`"${manifest.setup.fallbackTablePrefix}"`)) {
      errors.push(
        `${id} : le nettoyage ignore le préfixe de repli ${manifest.setup.fallbackTablePrefix}`,
      );
    }
    if (!cleanup.includes('Objets du TP restants')) {
      errors.push(`${id} : le nettoyage doit se terminer par le contrôle des objets restants`);
    }
    if (/DROP SCHEMA[^\n]*CASCADE/i.test(cleanup)) {
      errors.push(
        `${id} : DROP SCHEMA ... CASCADE interdit (risque de supprimer des objets de l'apprenant)`,
      );
    }
  }
  return errors;
}
