/** Chaîne de contrôle des artefacts de TP (bloquante en CI). */
import { checkNotebooksInSync } from './build-notebooks';
import { checkCleanup } from './check-cleanup';
import { lintNotebooks } from './lint-notebooks';
import { scanLabs } from './scan-sensitive';
import { validateManifests } from './validate-manifests';
import { verifyDatasets } from './verify-datasets';

const checks: [string, () => string[] | Promise<string[]>][] = [
  ['manifestes et preuves de validation', validateManifests],
  ['synchronisation des notebooks', checkNotebooksInSync],
  ['lint des notebooks (contraintes serverless)', lintNotebooks],
  ['couverture du nettoyage', checkCleanup],
  ['reproductibilité des jeux de données', () => verifyDatasets(false)],
  ['données personnelles et secrets', scanLabs],
];

let failed = false;
for (const [name, run] of checks) {
  const errors = await run();
  if (errors.length === 0) {
    console.log(`✓ ${name}`);
  } else {
    failed = true;
    console.error(`✗ ${name}`);
    for (const e of errors) console.error(`    ${e}`);
  }
}
if (failed) process.exit(1);
