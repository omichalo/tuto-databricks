import { DuckDBInstance } from '@duckdb/node-api';
import type { DuckDBConnection } from '@duckdb/node-api';
import type { CellValue } from '../../src/domain/sql/result-fingerprint';

export interface QueryResult {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly CellValue[])[];
}

export async function withDuckDb<T>(fn: (conn: DuckDBConnection) => Promise<T>): Promise<T> {
  const instance = await DuckDBInstance.create(':memory:', { threads: '1' });
  const conn = await instance.connect();
  try {
    return await fn(conn);
  } finally {
    conn.closeSync();
    instance.closeSync();
  }
}

export async function query(conn: DuckDBConnection, sql: string): Promise<QueryResult> {
  const reader = await conn.runAndReadAll(sql);
  const rows = reader.getRowsJS().map((row) => row.map((cell) => toCell(cell)));
  return { columns: reader.columnNames(), rows };
}

function toCell(value: unknown): CellValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    typeof value === 'boolean' ||
    value instanceof Date
  ) {
    return value;
  }
  // Les valeurs DuckDB non primitives (DECIMAL, INTERVAL…) exposent un toString() significatif.
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  return String(value);
}

export async function scalarNumber(conn: DuckDBConnection, sql: string): Promise<number> {
  const result = await query(conn, sql);
  const cell = result.rows[0]?.[0];
  if (cell === undefined || cell === null) throw new Error(`Aucune valeur pour : ${sql}`);
  const n = Number(typeof cell === 'object' ? cell.toString() : cell);
  if (!Number.isSafeInteger(n)) throw new Error(`Valeur non entière pour : ${sql}`);
  return n;
}
