import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderGenerator } from '../../src/domain/sql/generator-dialect';
import { canonicalCell } from '../../src/domain/sql/result-fingerprint';
import { query, scalarNumber, withDuckDb } from '../lib/duckdb-node';
import type { LabManifest } from '../../src/domain/labs/manifest-schema';

type Step =
  | { kind: 'query'; name: string; sql: string }
  | { kind: 'scalar'; name: string; sql: string }
  | { kind: 'exec'; name: string; sql: string };

export function parseReference(source: string): Step[] {
  const steps: Step[] = [];
  let current: { kind: Step['kind']; name: string; lines: string[] } | null = null;
  const flush = (): void => {
    if (current === null) return;
    const sql = current.lines.join('\n').trim();
    if (sql === '') throw new Error(`Étape vide : ${current.name}`);
    steps.push({ kind: current.kind, name: current.name, sql });
  };
  for (const line of source.split('\n')) {
    const marker = /^--\s*@(query|scalar|exec)\s+([A-Za-z][A-Za-z0-9]*)\s*$/.exec(line);
    if (marker !== null) {
      flush();
      current = { kind: marker[1] as Step['kind'], name: marker[2] ?? '', lines: [] };
      continue;
    }
    if (line.trim().startsWith('--')) continue;
    current?.lines.push(line);
  }
  flush();
  return steps;
}

export type ExpectedStats = Record<string, number | Record<string, string>[]>;

/** Génère les données dans DuckDB puis exécute le déroulé de référence. */
export async function computeExpectedStats(
  labDir: string,
  manifest: LabManifest,
): Promise<ExpectedStats> {
  const generator = readFileSync(join(labDir, manifest.data.generator), 'utf8');
  const reference = readFileSync(join(labDir, 'data', 'reference.sql'), 'utf8');
  const steps = parseReference(reference);
  return withDuckDb(async (conn) => {
    await conn.run(
      renderGenerator(generator, { dialect: 'duckdb', target: 'orders', rows: manifest.data.rows }),
    );
    const stats: ExpectedStats = {};
    for (const step of steps) {
      if (step.kind === 'exec') {
        await conn.run(step.sql);
      } else if (step.kind === 'scalar') {
        stats[step.name] = await scalarNumber(conn, step.sql);
      } else {
        const result = await query(conn, step.sql);
        stats[step.name] = result.rows.map((row) =>
          Object.fromEntries(result.columns.map((col, i) => [col, canonicalCell(row[i])])),
        );
      }
    }
    return stats;
  });
}
