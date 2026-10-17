import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import type { CellValue } from '@/domain/sql/result-fingerprint';
import { fingerprintResult } from '@/domain/sql/result-fingerprint';

const DUCKDB_VERSION = '1.32.0';
const BASE = `/vendor/duckdb/${DUCKDB_VERSION}`;
export const QUERY_TIMEOUT_MS = 10_000;
const MAX_DISPLAY_ROWS = 200;

export interface QueryOutput {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly CellValue[])[];
  readonly truncated: boolean;
  readonly elapsedMs: number;
}

export class QueryTimeoutError extends Error {
  constructor() {
    super(`Requête interrompue après ${String(QUERY_TIMEOUT_MS / 1000)} s`);
  }
}

interface Engine {
  readonly db: AsyncDuckDB;
  readonly worker: Worker;
  readonly conn: AsyncDuckDBConnection;
}

let engine: Promise<Engine> | null = null;

async function startEngine(): Promise<Engine> {
  const duckdb = await import('@duckdb/duckdb-wasm');
  const bundle = await duckdb.selectBundle({
    mvp: {
      mainModule: `${BASE}/duckdb-mvp.wasm`,
      mainWorker: `${BASE}/duckdb-browser-mvp.worker.js`,
    },
    eh: { mainModule: `${BASE}/duckdb-eh.wasm`, mainWorker: `${BASE}/duckdb-browser-eh.worker.js` },
  });
  if (bundle.mainWorker === null) throw new Error('Bundle DuckDB-Wasm incomplet');
  const worker = new Worker(bundle.mainWorker);
  const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  await db.open({ query: { castBigIntToDouble: true, castDecimalToDouble: true } });
  const conn = await db.connect();
  // Aucun accès réseau ni fichier depuis le SQL de l'apprenant, et configuration verrouillée.
  await conn.query('SET enable_external_access = false');
  await conn.query('SET lock_configuration = true');
  return { db, worker, conn };
}

function getEngine(): Promise<Engine> {
  engine ??= startEngine().catch((error: unknown) => {
    engine = null;
    throw error;
  });
  return engine;
}

async function resetEngine(): Promise<void> {
  const current = engine;
  engine = null;
  if (current === null) return;
  try {
    const e = await current;
    e.worker.terminate();
  } catch {
    // moteur déjà en échec
  }
}

function toCell(value: unknown, typeName: string): CellValue {
  if (value === null || value === undefined) return null;
  if (typeName.startsWith('Date') || typeName.startsWith('Timestamp')) {
    return new Date(typeof value === 'number' ? value : Number(value));
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (value instanceof Date) return value;
  return JSON.stringify(value);
}

async function withTimeout<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new QueryTimeoutError());
    }, QUERY_TIMEOUT_MS);
  });
  try {
    return await Promise.race([work, timeout]);
  } catch (error) {
    // Une requête interminable bloque le worker : on le termine et on repart d'un moteur neuf.
    if (error instanceof QueryTimeoutError) await resetEngine();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Exécute la requête de l'apprenant sur un jeu de données reconstruit à chaque exécution : l'apprenant
 * peut modifier ou supprimer la table sans conséquence pour l'essai suivant.
 */
export async function runExerciseQuery(
  setupSql: string,
  table: string,
  sql: string,
): Promise<QueryOutput> {
  const started = performance.now();
  return withTimeout(
    (async () => {
      const { conn } = await getEngine();
      await conn.query(`DROP TABLE IF EXISTS ${table}`);
      await conn.query(setupSql);
      const result = await conn.query(sql);
      const fields = result.schema.fields;
      const columns = fields.map((f) => f.name);
      const rows: CellValue[][] = [];
      for (const row of result.toArray() as { toArray(): unknown[] }[]) {
        const values = row.toArray();
        rows.push(fields.map((f, i) => toCell(values[i], String(f.type))));
      }
      return {
        columns,
        rows,
        truncated: rows.length > MAX_DISPLAY_ROWS,
        elapsedMs: Math.round(performance.now() - started),
      };
    })(),
  );
}

export function displayRows(output: QueryOutput): readonly (readonly CellValue[])[] {
  return output.rows.slice(0, MAX_DISPLAY_ROWS);
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function fingerprint(output: QueryOutput, ordered: boolean): Promise<string> {
  return fingerprintResult(output.rows, output.columns.length, ordered, sha256Hex);
}
