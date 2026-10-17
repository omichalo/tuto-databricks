import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  lintIpynb,
  lintNotebookSource,
  NOTEBOOK_RULES,
} from '../../../scripts/labs/lint-notebooks';
import {
  deriveVariant,
  parseDatabricksSource,
  toIpynb,
} from '../../../scripts/labs/notebook-format';
import { scanText } from '../../../scripts/labs/scan-sensitive';
import { checkCleanup } from '../../../scripts/labs/check-cleanup';
import { checkNotebooksInSync } from '../../../scripts/labs/build-notebooks';
import { validateManifests } from '../../../scripts/labs/validate-manifests';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const HEADER =
  '# Databricks notebook source\n# MAGIC %md\n# MAGIC # TP\n\n# COMMAND ----------\n\n';

const VIOLATIONS: Record<string, string> = {
  'no-scala-r': '# MAGIC %scala\n',
  'no-cache': 'df.cache()\n',
  'no-rdd': 'df.rdd.map(lambda r: r)\n',
  'no-processing-time': 'q = df.writeStream.trigger(processingTime="1 minute")\n',
  'no-dbfs': 'spark.read.csv("dbfs:/tmp/x.csv")\n',
  'no-network': 'import requests\n',
  'no-hive-variables': 'spark.sql("SELECT * FROM ${hivevar:t}")\n',
  'no-hardcoded-catalog': 'spark.table("main.default.orders")\n',
  'no-spark-conf-set': 'spark.conf.set("x", "y")\n',
  'no-pip-install': '%pip install pandas\n',
};

describe('lint des notebooks (contraintes serverless et Free Edition)', () => {
  it('chaque règle a un exemple de violation testé', () => {
    expect(Object.keys(VIOLATIONS).sort()).toEqual(NOTEBOOK_RULES.map((r) => r.id).sort());
  });

  for (const [id, code] of Object.entries(VIOLATIONS)) {
    it(`détecte ${id}`, () => {
      const errors = lintNotebookSource(
        join(ROOT, 'x.py'),
        `${HEADER}${code}\n# COMMAND ----------\n\nprint(1)\n`,
      );
      expect(errors.some((e) => e.includes(`[${id}]`))).toBe(true);
    });
  }

  it('accepte un notebook conforme', () => {
    const ok = `${HEADER}print("ok")\n\n# COMMAND ----------\n\nprint(2)\n`;
    expect(lintNotebookSource(join(ROOT, 'x.py'), ok)).toEqual([]);
  });

  it('refuse un .ipynb committé avec des sorties', () => {
    const nb = JSON.stringify({
      cells: [{ cell_type: 'code', outputs: [{ text: 'x' }], execution_count: 1, source: [] }],
    });
    expect(lintIpynb(join(ROOT, 'x.ipynb'), nb)).toHaveLength(1);
  });
});

describe('format des notebooks', () => {
  const source = readFileSync(join(ROOT, 'labs/delta-first-table/notebooks/source.py'), 'utf8');

  it('la variante exercice ne contient aucune solution', () => {
    const exercise = deriveVariant(source, 'exercise');
    expect(exercise).not.toMatch(/>>> SOLUTION|<<< SOLUTION/);
    expect(exercise).toContain('# Databricks notebook source');
  });

  it('la conversion ipynb conserve le nombre de cellules et ne contient pas de sorties', () => {
    const cells = parseDatabricksSource(deriveVariant(source, 'exercise'));
    const nb = JSON.parse(toIpynb(cells, 'TP')) as { cells: { outputs?: unknown[] }[] };
    expect(nb.cells).toHaveLength(cells.length);
    expect(nb.cells.every((c) => (c.outputs ?? []).length === 0)).toBe(true);
  });
});

describe('données sensibles', () => {
  it('détecte jetons, URL de workspace et données personnelles', () => {
    // Jeton factice assemblé à l'exécution : un littéral serait bloqué par les scanners de secrets.
    const fakeToken = ['dapi', '0123456789abcdef0123456789abcdef'].join('');
    expect(scanText(`token = "${fakeToken}"`).length).toBeGreaterThan(0);
    expect(scanText('https://adb-1234567890123456.7.azuredatabricks.net').length).toBeGreaterThan(
      0,
    );
    expect(scanText('contact: jean.dupont@example.org').length).toBeGreaterThan(0);
    expect(scanText('-----BEGIN PRIVATE KEY-----').length).toBeGreaterThan(0);
    expect(scanText('SELECT country, SUM(amount_cents) FROM orders').length).toBe(0);
  });
});

describe('chaîne de tests des artefacts du TP pilote', () => {
  it('manifestes, notebooks générés et nettoyage sont cohérents', () => {
    expect(validateManifests()).toEqual([]);
    expect(checkNotebooksInSync()).toEqual([]);
    expect(checkCleanup()).toEqual([]);
  });

  it('aucun dossier de validation ne contient de preuve fictive', () => {
    const dir = join(ROOT, 'labs/delta-first-table/validation');
    const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')) : [];
    expect(files).toEqual([]);
  });
});
