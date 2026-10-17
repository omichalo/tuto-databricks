/**
 * Après `next build` : les pages pré-rendues correspondent exactement aux contenus visibles pour
 * CONTENT_MIN_STATUS (par défaut `published`, comme en production). Un contenu non publié ou un TP
 * qu'aucune leçon visible ne référence ne doit produire aucune page.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { isContentVisible, parseContentMinStatus } from '../src/domain/content/status';
import { LABS, LESSONS } from '../src/generated/content';

const ROOT = join(import.meta.dirname, '..');
const manifestPath = join(ROOT, '.next', 'prerender-manifest.json');
if (!existsSync(manifestPath)) {
  console.error('✗ .next/prerender-manifest.json absent : lancer `next build` avant ce contrôle');
  process.exit(1);
}
const routes = new Set(
  Object.keys(
    z
      .object({ routes: z.record(z.string(), z.unknown()) })
      .parse(JSON.parse(readFileSync(manifestPath, 'utf8'))).routes,
  ),
);

const min = parseContentMinStatus(process.env.CONTENT_MIN_STATUS);
const errors: string[] = [];

for (const lesson of LESSONS) {
  const route = `/fr/tracks/${lesson.trackId}/${lesson.id}`;
  const expected = isContentVisible(lesson.status, min);
  if (routes.has(route) !== expected) {
    errors.push(
      `${route} : statut ${lesson.status}, seuil ${min} → page ${expected ? 'attendue' : 'interdite'}`,
    );
  }
}
for (const lab of LABS) {
  const id = lab.manifest.id;
  const route = `/fr/labs/${id}`;
  const expected = LESSONS.some((l) => l.labId === id && isContentVisible(l.status, min));
  if (routes.has(route) !== expected) {
    errors.push(`${route} : page ${expected ? 'attendue' : 'interdite'} (seuil ${min})`);
  }
}

if (errors.length > 0) {
  for (const e of errors) console.error(`✗ ${e}`);
  process.exit(1);
}
console.log(`✓ visibilité conforme au seuil ${min} (${String(routes.size)} routes pré-rendues)`);
