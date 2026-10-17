/**
 * Les générateurs de données des labs sont écrits une seule fois avec quelques macros, puis rendus
 * pour Spark SQL (notebook Databricks) ou DuckDB (navigateur et CI). Seules des opérations entières
 * portables sont autorisées : pas de rand(), pas de fonction de hachage propre à un moteur.
 *
 * Macros :
 *   {{TARGET}}               nom de la table cible
 *   {{IDS(n)}}               sous-requête produisant une colonne `id` de 0 à n - 1
 *   {{DATE_ADD(date, days)}} date + nombre entier de jours
 */
export type GeneratorDialect = 'spark' | 'duckdb';

export interface RenderOptions {
  readonly dialect: GeneratorDialect;
  readonly target: string;
  readonly rows: number;
}

const FORBIDDEN = [
  /\brand(om)?\s*\(/i,
  /\buuid\s*\(/i,
  /\bhash\s*\(/i,
  /\bnow\s*\(/i,
  /current_(date|timestamp)/i,
];

export function assertPortableGenerator(source: string): void {
  for (const pattern of FORBIDDEN) {
    if (pattern.test(source)) {
      throw new Error(`Générateur non déterministe ou non portable : motif ${pattern.source}`);
    }
  }
}

export function renderGenerator(source: string, options: RenderOptions): string {
  assertPortableGenerator(source);
  if (!Number.isInteger(options.rows) || options.rows <= 0) {
    throw new Error('rows doit être un entier strictement positif');
  }
  let sql = source.replaceAll('{{TARGET}}', options.target);
  sql = sql.replace(/\{\{IDS\(ROWS\)\}\}/g, () =>
    options.dialect === 'spark'
      ? `(SELECT id FROM range(0, ${options.rows.toString()}))`
      : `(SELECT range AS id FROM range(0, ${options.rows.toString()}))`,
  );
  sql = sql.replace(/\{\{DATE_ADD\(([^,]+),\s*([^}]+)\)\}\}/g, (_m, date: string, days: string) =>
    options.dialect === 'spark'
      ? `date_add(${date.trim()}, ${days.trim()})`
      : `CAST(${date.trim()} + ${days.trim()} AS DATE)`,
  );
  if (sql.includes('{{')) throw new Error('Macro de générateur inconnue');
  return sql.trim();
}
