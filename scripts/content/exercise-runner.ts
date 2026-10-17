import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ExerciseFile } from '../../src/domain/content/schema';
import { renderGenerator } from '../../src/domain/sql/generator-dialect';
import { canonicalResult } from '../../src/domain/sql/result-fingerprint';
import type { QueryResult } from '../lib/duckdb-node';
import { query, withDuckDb } from '../lib/duckdb-node';
import { ROOT } from '../labs/lab-files';

export function datasetSetupSql(exercise: Pick<ExerciseFile, 'dataset'>): string {
  const generator = readFileSync(join(ROOT, exercise.dataset.generator), 'utf8');
  return renderGenerator(generator, {
    dialect: 'duckdb',
    target: exercise.dataset.table,
    rows: exercise.dataset.rows,
  });
}

export async function runOnDataset(
  exercise: Pick<ExerciseFile, 'dataset'>,
  sql: string,
): Promise<QueryResult> {
  return withDuckDb(async (conn) => {
    await conn.run(datasetSetupSql(exercise));
    return query(conn, sql);
  });
}

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export async function solutionFingerprint(exercise: ExerciseFile): Promise<{
  hash: string;
  result: QueryResult;
}> {
  const result = await runOnDataset(exercise, exercise.solutionSql);
  const canonical = canonicalResult(result.rows, result.columns.length, exercise.ordered);
  return { hash: sha256Hex(canonical), result };
}
