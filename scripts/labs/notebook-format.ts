/**
 * Conversion entre le format source Databricks (.py) et Jupyter (.ipynb), et dérivation des
 * notebooks d'exercice et de corrigé à partir d'un fichier source unique.
 */
export const SOURCE_HEADER = '# Databricks notebook source';
const CELL_SEPARATOR = /\n# COMMAND -{10}\n/;

export interface NotebookCell {
  readonly kind: 'markdown' | 'code';
  readonly source: string;
}

export function parseDatabricksSource(text: string): NotebookCell[] {
  const normalized = text.replace(/\r\n/g, '\n');
  if (!normalized.startsWith(`${SOURCE_HEADER}\n`)) {
    throw new Error(`En-tête "${SOURCE_HEADER}" manquant`);
  }
  const body = normalized.slice(SOURCE_HEADER.length + 1);
  return body
    .split(CELL_SEPARATOR)
    .map((chunk) => chunk.replace(/^\n+/, '').replace(/\n+$/, ''))
    .filter((chunk) => chunk !== '')
    .map((chunk): NotebookCell => {
      const lines = chunk.split('\n');
      if (lines.every((l) => l.startsWith('# MAGIC'))) {
        const stripped = lines.map((l) => l.replace(/^# MAGIC ?/, ''));
        if (stripped[0]?.trim() === '%md') {
          return { kind: 'markdown', source: stripped.slice(1).join('\n') };
        }
        return { kind: 'code', source: stripped.join('\n') };
      }
      return { kind: 'code', source: chunk };
    });
}

function toSourceLines(source: string): string[] {
  const lines = source.split('\n');
  return lines.map((line, i) => (i < lines.length - 1 ? `${line}\n` : line));
}

export function toIpynb(cells: readonly NotebookCell[], title: string): string {
  const notebook = {
    cells: cells.map((cell) =>
      cell.kind === 'markdown'
        ? { cell_type: 'markdown', metadata: {}, source: toSourceLines(cell.source) }
        : {
            cell_type: 'code',
            execution_count: null,
            metadata: {},
            outputs: [],
            source: toSourceLines(cell.source),
          },
    ),
    metadata: {
      kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
      language_info: { name: 'python' },
      'application/vnd.databricks.v1+notebook': { notebookName: title, language: 'python' },
    },
    nbformat: 4,
    nbformat_minor: 5,
  };
  return `${JSON.stringify(notebook, null, 1)}\n`;
}

/**
 * Le source contient des blocs :
 *   # >>> SOLUTION / code du corrigé / # === EXERCISE / lignes préfixées "# | " / # <<< SOLUTION
 */
export function deriveVariant(source: string, variant: 'exercise' | 'solution'): string {
  const out: string[] = [];
  let state: 'outside' | 'solution' | 'exercise' = 'outside';
  for (const line of source.replace(/\r\n/g, '\n').split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '# >>> SOLUTION') {
      if (state !== 'outside') throw new Error('Bloc SOLUTION imbriqué');
      state = 'solution';
      continue;
    }
    if (trimmed === '# === EXERCISE') {
      if (state !== 'solution') throw new Error('EXERCISE hors d’un bloc SOLUTION');
      state = 'exercise';
      continue;
    }
    if (trimmed === '# <<< SOLUTION') {
      if (state !== 'exercise') throw new Error('Bloc SOLUTION sans partie EXERCISE');
      state = 'outside';
      continue;
    }
    if (state === 'outside') out.push(line);
    else if (state === 'solution' && variant === 'solution') out.push(line);
    else if (state === 'exercise' && variant === 'exercise') {
      if (!line.startsWith('# | ') && line !== '# |') {
        throw new Error(`Ligne d’exercice sans préfixe "# | " : ${line}`);
      }
      out.push(line === '# |' ? '' : line.slice(4));
    }
  }
  if (state !== 'outside') throw new Error('Bloc SOLUTION non fermé');
  return out.join('\n');
}

export function replaceBetweenMarkers(
  text: string,
  begin: string,
  end: string,
  replacement: string,
): string {
  const start = text.indexOf(begin);
  const stop = text.indexOf(end);
  if (start === -1 || stop === -1 || stop < start) {
    throw new Error(`Marqueurs ${begin} / ${end} introuvables`);
  }
  return `${text.slice(0, start + begin.length)}\n${replacement}\n${text.slice(stop)}`;
}
