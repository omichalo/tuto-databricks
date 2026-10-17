/**
 * Après `next build` : vérifie qu'aucune clé de correction n'a fuité dans les fichiers servis au
 * navigateur (.next/static, HTML pré-rendus, public/). Les canaris sont présents uniquement dans les
 * modules serveur ; les retrouver côté client signale une fuite.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { EXERCISE_KEYS, KEYS_CANARY, LAB_KEYS } from '../src/generated/server/keys';

const ROOT = join(import.meta.dirname, '..');

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const needles = [
  KEYS_CANARY,
  ...Object.values(LAB_KEYS).flatMap((k) => [k.canary, k.checkCode]),
  ...Object.values(EXERCISE_KEYS).map((k) => k.expectedHash),
];

const staticDir = join(ROOT, '.next', 'static');
if (!existsSync(staticDir)) {
  console.error('✗ .next/static absent : lancer `next build` avant ce contrôle');
  process.exit(1);
}
const files = [
  ...walk(staticDir),
  ...walk(join(ROOT, '.next', 'server', 'app')).filter((f) => /\.(html|rsc)$/.test(f)),
  ...walk(join(ROOT, 'public')).filter((f) => !f.includes(join('public', 'vendor'))),
];

const leaks: string[] = [];
for (const file of files) {
  const text = readFileSync(file, 'latin1');
  for (const needle of needles) {
    if (text.includes(needle))
      leaks.push(`${relative(ROOT, file)} contient ${needle.slice(0, 12)}…`);
  }
}

if (leaks.length > 0) {
  console.error(`✗ fuite de clés dans les fichiers client :\n  - ${leaks.join('\n  - ')}`);
  process.exit(1);
}
console.log(
  `✓ aucune clé de correction dans ${String(files.length)} fichiers client (${String(needles.length)} motifs)`,
);
