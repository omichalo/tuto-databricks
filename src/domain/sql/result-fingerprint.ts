/**
 * Empreinte canonique d'un résultat SQL, indépendante du moteur (DuckDB-Wasm dans le navigateur,
 * DuckDB natif en CI). Seules les positions des colonnes comptent, pas leurs noms.
 */
export type CellValue = string | number | bigint | boolean | null | Date | { toString(): string };

const NUMERIC = /^-?\d+(\.\d+)?$/;

export function canonicalCell(value: CellValue | undefined): string {
  if (value === null || value === undefined) return '∅';
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return canonicalNumber(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = typeof value === 'string' ? value : value.toString();
  if (NUMERIC.test(text)) return canonicalNumber(Number(text));
  return text;
}

function canonicalNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n)) return n.toFixed(0);
  return n.toFixed(6);
}

export function canonicalResult(
  rows: readonly (readonly CellValue[])[],
  columnCount: number,
  ordered: boolean,
): string {
  const lines = rows.map((row) => {
    const cells: string[] = [];
    for (let i = 0; i < columnCount; i += 1) cells.push(canonicalCell(row[i]));
    return cells.join('\u241F');
  });
  if (!ordered) lines.sort();
  return `${columnCount.toString()}\u241E${lines.join('\u241E')}`;
}

export type Sha256Hex = (input: string) => Promise<string>;

export async function fingerprintResult(
  rows: readonly (readonly CellValue[])[],
  columnCount: number,
  ordered: boolean,
  sha256Hex: Sha256Hex,
): Promise<string> {
  return sha256Hex(canonicalResult(rows, columnCount, ordered));
}
