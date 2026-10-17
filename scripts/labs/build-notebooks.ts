/**
 * Produit, pour chaque lab, à partir de notebooks/source.py et des statistiques attendues :
 *   notebooks/exercise.py, notebooks/solution.py, les .ipynb correspondants (+ cleanup.ipynb)
 *   et verification.server.json (code de contrôle attendu, jamais envoyé au navigateur).
 * `--check` échoue si un fichier committé n'est plus synchronisé.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { computeCheckCode } from '../../src/domain/labs/check-code';
import { renderGenerator } from '../../src/domain/sql/generator-dialect';
import { listLabDirs, loadLab, ROOT } from './lab-files';
import {
  deriveVariant,
  parseDatabricksSource,
  replaceBetweenMarkers,
  toIpynb,
} from './notebook-format';

interface Output {
  readonly path: string;
  readonly content: string;
}

function scalarStats(stats: Record<string, unknown>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(stats).filter(
      (entry): entry is [string, number] => typeof entry[1] === 'number',
    ),
  );
}

export function buildLabOutputs(labDir: string): Output[] {
  const { manifest } = loadLab(labDir);
  const nb = join(labDir, 'notebooks');
  const stats = JSON.parse(
    readFileSync(join(labDir, manifest.data.expectedStats), 'utf8'),
  ) as Record<string, unknown>;
  const scalars = scalarStats(stats);
  const generator = renderGenerator(readFileSync(join(labDir, manifest.data.generator), 'utf8'), {
    dialect: 'spark',
    target: '{T_ORDERS}',
    rows: manifest.data.rows,
  });

  let source = readFileSync(join(nb, 'source.py'), 'utf8');
  source = source.replace('__GENERATOR__', generator);
  const expectedBlock = [
    'EXPECTED = {',
    ...Object.entries(scalars).map(([k, v]) => `    "${k}": ${String(v)},`),
    '}',
  ].join('\n');
  source = replaceBetweenMarkers(source, '# BEGIN EXPECTED', '# END EXPECTED', expectedBlock);

  const exercise = deriveVariant(source, 'exercise');
  const solution = deriveVariant(source, 'solution');
  const cleanup = readFileSync(join(nb, 'cleanup.py'), 'utf8');

  const deliveredRevenueCents = scalars.deliveredRevenueCents;
  const pendingAfterUpdate = scalars.pendingAfterUpdate;
  const cancelledAfterUpdate = scalars.cancelledAfterUpdate;
  if (
    deliveredRevenueCents === undefined ||
    pendingAfterUpdate === undefined ||
    cancelledAfterUpdate === undefined
  ) {
    throw new Error(`${manifest.id} : statistiques nécessaires au code de contrôle absentes`);
  }
  const verification = {
    labId: manifest.id,
    labVersion: manifest.version,
    checkCode: computeCheckCode(manifest.verification.checkCodePrefix, {
      deliveredRevenueCents,
      pendingAfterUpdate,
      cancelledAfterUpdate,
    }),
    canary: `CANARY-LAB-VERIFICATION-${manifest.id}`,
  };

  return [
    { path: join(nb, 'exercise.py'), content: exercise },
    { path: join(nb, 'solution.py'), content: solution },
    {
      path: join(nb, 'exercise.ipynb'),
      content: toIpynb(parseDatabricksSource(exercise), `${manifest.id}-exercise`),
    },
    {
      path: join(nb, 'solution.ipynb'),
      content: toIpynb(parseDatabricksSource(solution), `${manifest.id}-solution`),
    },
    {
      path: join(nb, 'cleanup.ipynb'),
      content: toIpynb(parseDatabricksSource(cleanup), `${manifest.id}-cleanup`),
    },
    {
      path: join(labDir, 'verification.server.json'),
      content: `${JSON.stringify(verification, null, 2)}\n`,
    },
  ];
}

export function checkNotebooksInSync(): string[] {
  const errors: string[] = [];
  for (const dir of listLabDirs()) {
    for (const output of buildLabOutputs(dir)) {
      const current = existsSync(output.path) ? readFileSync(output.path, 'utf8') : null;
      if (current !== output.content) {
        errors.push(
          `${relative(ROOT, output.path)} n'est pas synchronisé (npm run labs:build-notebooks)`,
        );
      }
    }
  }
  return errors;
}

if (process.argv[1]?.endsWith('build-notebooks.ts') === true) {
  if (process.argv.includes('--check')) {
    const errors = checkNotebooksInSync();
    for (const e of errors) console.error(`✗ ${e}`);
    if (errors.length > 0) process.exit(1);
    console.log('✓ notebooks synchronisés');
  } else {
    for (const dir of listLabDirs()) {
      for (const output of buildLabOutputs(dir)) {
        writeFileSync(output.path, output.content);
        console.log(`écrit : ${relative(ROOT, output.path)}`);
      }
    }
  }
}
