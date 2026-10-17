import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { listLabDirs, ROOT } from './lab-files';
import { parseDatabricksSource, SOURCE_HEADER } from './notebook-format';

interface Rule {
  readonly id: string;
  readonly pattern: RegExp;
  readonly message: string;
}

/** Contraintes du calcul serverless et de Free Edition, appliquées aux sources des notebooks. */
export const NOTEBOOK_RULES: readonly Rule[] = [
  {
    id: 'no-scala-r',
    pattern: /^#\s*MAGIC\s+%(scala|r)\b/m,
    message: 'Scala et R ne sont pas pris en charge en serverless',
  },
  {
    id: 'no-cache',
    pattern: /\.(cache|persist)\s*\(|\bCACHE\s+(LAZY\s+)?TABLE\b/i,
    message: 'API de cache non prise en charge en serverless',
  },
  {
    id: 'no-rdd',
    pattern: /\.rdd\b|\bsc\.|\bsparkContext\b|SparkContext/,
    message: 'RDD et SparkContext non pris en charge en serverless',
  },
  {
    id: 'no-processing-time',
    pattern: /processingTime|ProcessingTime|trigger\s*\(\s*\)/,
    message:
      'Triggers ProcessingTime et Continuous non pris en charge en serverless : utiliser Trigger.AvailableNow',
  },
  {
    id: 'no-dbfs',
    pattern: /dbfs:\/|["']\/dbfs\/|\/FileStore\//,
    message: 'Chemins DBFS interdits : utiliser des tables ou des volumes Unity Catalog',
  },
  {
    id: 'no-network',
    pattern: /\b(requests|urllib|httpx|wget|curl)\b|https?:\/\/(?!docs\.databricks\.com)/,
    message: 'Aucun accès réseau sortant dans un TP (Free Edition le restreint)',
  },
  {
    id: 'no-hive-variables',
    pattern: /\$\{[A-Za-z_.:]+\}/,
    message: 'Variables Hive ${} non prises en charge en serverless',
  },
  {
    id: 'no-hardcoded-catalog',
    pattern: /\b(hive_metastore|main|samples)\.[a-z_]+\.[a-z_]+/i,
    message: 'Ne pas coder un catalogue en dur : utiliser le widget catalog',
  },
  {
    id: 'no-spark-conf-set',
    pattern: /spark\.conf\.set\s*\(/,
    message: 'Configuration Spark limitée en serverless',
  },
  {
    id: 'no-pip-install',
    pattern: /%pip\s+install|pip\s+install/,
    message: 'Pas d’installation de paquets (réseau restreint)',
  },
];

export function lintNotebookSource(path: string, text: string): string[] {
  const errors: string[] = [];
  const rel = relative(ROOT, path);
  if (!text.startsWith(SOURCE_HEADER)) errors.push(`${rel} : en-tête "${SOURCE_HEADER}" manquant`);
  for (const rule of NOTEBOOK_RULES) {
    const match = rule.pattern.exec(text);
    if (match !== null) {
      const line = text.slice(0, match.index).split('\n').length;
      errors.push(`${rel}:${String(line)} [${rule.id}] ${rule.message}`);
    }
  }
  try {
    const cells = parseDatabricksSource(text);
    if (cells.length < 3) errors.push(`${rel} : trop peu de cellules`);
    if (cells[0]?.kind !== 'markdown')
      errors.push(`${rel} : la première cellule doit présenter le TP (markdown)`);
  } catch (error) {
    errors.push(`${rel} : ${error instanceof Error ? error.message : String(error)}`);
  }
  return errors;
}

export function lintIpynb(path: string, text: string): string[] {
  const rel = relative(ROOT, path);
  const nb = JSON.parse(text) as {
    cells?: { cell_type: string; outputs?: unknown[]; execution_count?: unknown }[];
  };
  const errors: string[] = [];
  for (const [i, cell] of (nb.cells ?? []).entries()) {
    if (
      cell.cell_type === 'code' &&
      ((cell.outputs?.length ?? 0) > 0 || cell.execution_count !== null)
    ) {
      errors.push(
        `${rel} : la cellule ${String(i)} contient des sorties (les notebooks committés doivent être vierges)`,
      );
    }
  }
  return errors;
}

export function lintNotebooks(): string[] {
  const errors: string[] = [];
  for (const dir of listLabDirs()) {
    const nbDir = join(dir, 'notebooks');
    for (const name of readdirSync(nbDir)) {
      const path = join(nbDir, name);
      const text = readFileSync(path, 'utf8');
      if (name.endsWith('.py')) errors.push(...lintNotebookSource(path, text));
      if (name.endsWith('.ipynb')) errors.push(...lintIpynb(path, text));
    }
  }
  return errors;
}
