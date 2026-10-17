/**
 * Rapport de contenu (CI) : métriques de la définition de « terminé » par leçon, statuts, couverture
 * des objectifs et statut des TP par environnement. `--strict` échoue sur toute erreur d'intégrité.
 * Écrit content-report.json à la racine (artefact CI, ignoré par git).
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { contentIntegrityErrors, loadContent } from './content/load-content';
import { computeArtifactHash, listLabDirs, loadLab, ROOT } from './labs/lab-files';
import { effectiveLabStatus } from '../src/domain/labs/status';

const strict = process.argv.includes('--strict');
const content = loadContent();
const labs = listLabDirs().map((dir) => {
  const { manifest } = loadLab(dir);
  const hash = computeArtifactHash(dir);
  const envs = (['databricks-free-manual', 'professional-workspace'] as const).map((env) => {
    const e = manifest.environments[env];
    return {
      env,
      declared: e.status,
      ...effectiveLabStatus(e.status, e.validation?.artifactHash ?? null, hash),
    };
  });
  return {
    id: manifest.id,
    version: manifest.version,
    artifactHash: hash,
    browser: manifest.environments.browser.supported,
    environments: envs,
  };
});
const errors = contentIntegrityErrors(content, new Set(labs.map((l) => l.id)));

const lessons = content.lessons.map((l) => ({
  id: l.frontmatter.id,
  status: l.frontmatter.status,
  objectives: l.frontmatter.objectiveIds.length,
  sources: l.frontmatter.sources.length,
  quizQuestions: l.quiz.questions.length,
  exercise: l.frontmatter.exerciseId ?? null,
  lab: l.frontmatter.labId ?? null,
  english: l.hasEnglish,
}));
const coveredObjectives = new Set(content.lessons.flatMap((l) => l.frontmatter.objectiveIds));
const report = {
  generatedAt: new Date().toISOString(),
  tracks: content.tracks.length,
  lessons,
  statusCounts: lessons.reduce<Record<string, number>>(
    (acc, l) => ({ ...acc, [l.status]: (acc[l.status] ?? 0) + 1 }),
    {},
  ),
  objectives: { total: content.objectives.size, covered: coveredObjectives.size },
  labs,
  errors,
};
writeFileSync(join(ROOT, 'content-report.json'), `${JSON.stringify(report, null, 2)}\n`);

console.log(
  `Parcours : ${String(report.tracks)} · Leçons : ${String(lessons.length)} ${JSON.stringify(report.statusCounts)}`,
);
console.log(
  `Objectifs couverts : ${String(coveredObjectives.size)} / ${String(content.objectives.size)}`,
);
for (const lab of labs) {
  const summary = lab.environments
    .map((e) => `${e.env}=${e.status}${e.stale ? ' (périmé)' : ''}`)
    .join(', ');
  console.log(`TP ${lab.id} v${lab.version} : navigateur=${lab.browser}, ${summary}`);
}
if (errors.length > 0) {
  console.error(`✗ ${String(errors.length)} erreur(s) :\n  - ${errors.join('\n  - ')}`);
  if (strict) process.exit(1);
} else {
  console.log('✓ intégrité du contenu');
}
