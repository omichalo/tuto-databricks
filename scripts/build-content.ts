/**
 * Compile le contenu versionné (content/, labs/) en deux modules TypeScript :
 *   src/generated/content.ts        : données publiques (leçons, quiz sans réponses, exercices, labs)
 *   src/generated/server/keys.ts    : corrigés et codes attendus, `server-only`
 * et copie les artefacts téléchargeables des labs dans public/labs/<labId>/.
 * Échoue si le contenu viole un contrôle de la définition de Done.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  PublicExercise,
  PublicLesson,
  PublicObjective,
  PublicQuiz,
  PublicTrack,
} from '../src/domain/content/public-types';
import type { LabArtifactRef, PublicLab } from '../src/domain/labs/types';
import { isContentVisible, parseContentMinStatus } from '../src/domain/content/status';
import { effectiveLabStatus } from '../src/domain/labs/status';
import type { QuizKeyQuestion } from '../src/domain/quiz/grade';
import { contentIntegrityErrors, loadContent } from './content/load-content';
import { datasetSetupSql } from './content/exercise-runner';
import { computeArtifactHash, listLabDirs, loadLab, ROOT, sha256File } from './labs/lab-files';

const GENERATED = join(ROOT, 'src', 'generated');
const PUBLIC_LABS = join(ROOT, 'public', 'labs');

function header(): string {
  return '// Fichier généré par scripts/build-content.ts : ne pas modifier.\n/* eslint-disable */\n';
}

function main(): void {
  const content = loadContent();
  const labs = listLabDirs().map((dir) => loadLab(dir));
  const labIds = new Set(labs.map((l) => l.manifest.id));
  const errors = contentIntegrityErrors(content, labIds);
  for (const lab of labs) {
    const m = lab.manifest;
    const browserExercise = m.environments.browser.exerciseId;
    if (browserExercise !== undefined && !content.exercises.has(browserExercise)) {
      errors.push(`lab ${m.id} : exercice navigateur inconnu ${browserExercise}`);
    }
    for (const lessonId of m.lessonIds) {
      if (!content.lessons.some((l) => l.frontmatter.id === lessonId))
        errors.push(`lab ${m.id} : leçon inconnue ${lessonId}`);
    }
  }
  if (errors.length > 0) {
    for (const e of errors) console.error(`✗ ${e}`);
    process.exit(1);
  }

  const objectives: PublicObjective[] = [...content.objectives.values()].map((o) => ({
    id: o.id,
    bloom: o.bloom,
    text: o.fr,
    sources: o.sources,
  }));

  const tracks: PublicTrack[] = content.tracks.map((t) => ({
    id: t.id,
    version: t.version,
    title: t.title,
    summary: t.summary,
    level: t.level,
    modules: t.modules.map((m) => ({
      id: m.id,
      title: m.title,
      summary: m.summary,
      lessonIds: m.lessons,
    })),
  }));

  const lessons: PublicLesson[] = content.lessons.map((l) => {
    const fm = l.frontmatter;
    return {
      id: fm.id,
      trackId: l.trackId,
      moduleId: l.moduleId,
      title: fm.title,
      summary: fm.summary,
      status: fm.status,
      durationMinutes: fm.durationMinutes,
      objectiveIds: fm.objectiveIds,
      sources: fm.sources,
      translations: fm.translations,
      exerciseId: fm.exerciseId ?? null,
      labId: fm.labId ?? null,
      interactionWaiver: fm.interactionWaiver ?? null,
      verifiedOn: fm.verifiedOn ?? null,
      headings: l.headings,
      bodyFr: l.body,
      quizQuestionCount: l.quiz.questions.length,
    };
  });

  const quizzes: PublicQuiz[] = content.lessons.map((l) => ({
    lessonId: l.frontmatter.id,
    questions: l.quiz.questions.map((q) => ({
      id: q.id,
      objectiveId: q.objectiveId,
      kind: q.kind,
      prompt: q.prompt,
      code: q.code ?? null,
      choices: q.choices.map((c) => ({ id: c.id, text: c.text })),
    })),
  }));

  const quizKeys: Record<string, QuizKeyQuestion[]> = Object.fromEntries(
    content.lessons.map((l) => [
      l.frontmatter.id,
      l.quiz.questions.map((q) => ({
        id: q.id,
        kind: q.kind,
        choices: q.choices.map((c) => ({
          id: c.id,
          correct: c.correct,
          explanation: c.explanation,
        })),
        ...(q.sectionAnchor === undefined ? {} : { sectionAnchor: q.sectionAnchor }),
      })),
    ]),
  );

  const exercises: PublicExercise[] = [...content.exercises.values()].map((e) => ({
    id: e.id,
    title: e.title,
    objectiveIds: e.objectiveIds,
    statement: e.statement,
    hints: e.hints,
    setupSql: datasetSetupSql(e),
    table: e.dataset.table,
    rows: e.dataset.rows,
    starterSql: e.starterSql,
    ordered: e.ordered,
    expectedShape: e.expectedShape,
    dialectNotes: e.dialectNotes,
  }));
  const exerciseKeys = Object.fromEntries(
    [...content.exercises.values()].map((e) => [
      e.id,
      { expectedHash: e.expectedHash, ordered: e.ordered },
    ]),
  );

  rmSync(PUBLIC_LABS, { recursive: true, force: true });
  const publicLabs: PublicLab[] = [];
  const labKeys: Record<
    string,
    { checkCode: string; canary: string; solutionIpynb: string; labVersion: string }
  > = {};
  // Seuil explicite (CI, App Hosting) : seuls les TP référencés par une leçon visible sont publiés
  // dans public/. Sans seuil (développement local), tout est copié.
  const rawMin = process.env.CONTENT_MIN_STATUS;
  const publishable = (labId: string): boolean => {
    if (rawMin === undefined || rawMin === '') return true;
    const min = parseContentMinStatus(rawMin);
    return lessons.some((l) => l.labId === labId && isContentVisible(l.status, min));
  };
  for (const lab of labs) {
    const m = lab.manifest;
    const hash = computeArtifactHash(lab.dir);
    const outDir = join(PUBLIC_LABS, m.id);
    const publish = publishable(m.id);
    if (publish) mkdirSync(outDir, { recursive: true });
    const artifacts: LabArtifactRef[] = [];
    const downloadable: [LabArtifactRef['kind'], string][] = [
      ['exercise-notebook', 'notebooks/exercise.ipynb'],
      ['exercise-source', 'notebooks/exercise.py'],
      ['cleanup-notebook', 'notebooks/cleanup.ipynb'],
      ['cleanup-source', 'notebooks/cleanup.py'],
    ];
    for (const [kind, rel] of downloadable) {
      const src = join(lab.dir, rel);
      const fileName = `${m.id}-${rel.split('/').pop() ?? rel}`;
      if (publish) copyFileSync(src, join(outDir, fileName));
      artifacts.push({
        kind,
        fileName,
        href: `/labs/${m.id}/${fileName}`,
        sha256: sha256File(src),
      });
    }
    const statusFor = (
      env: 'databricks-free-manual' | 'professional-workspace',
    ): PublicLab['status'][typeof env] => {
      const e = m.environments[env];
      const eff = effectiveLabStatus(e.status, e.validation?.artifactHash ?? null, hash);
      return {
        declared: e.status,
        effective: eff.status,
        stale: eff.stale,
        validatedOn: eff.status === 'validated' ? (e.validation?.date ?? null) : null,
        validatedEnvironment:
          eff.status === 'validated' ? (e.validation?.environment ?? null) : null,
      };
    };
    publicLabs.push({
      manifest: m,
      artifactHash: hash,
      status: {
        'databricks-free-manual': statusFor('databricks-free-manual'),
        'professional-workspace': statusFor('professional-workspace'),
      },
      artifacts,
      readmeFr: readFileSync(join(lab.dir, 'README.fr.md'), 'utf8'),
      expectedResults: JSON.parse(
        readFileSync(join(lab.dir, m.data.expectedStats), 'utf8'),
      ) as Record<string, unknown>,
    });
    const verificationPath = join(lab.dir, 'verification.server.json');
    if (!existsSync(verificationPath)) throw new Error(`${m.id} : verification.server.json absent`);
    const verification = JSON.parse(readFileSync(verificationPath, 'utf8')) as {
      checkCode: string;
      canary: string;
    };
    labKeys[m.id] = {
      checkCode: verification.checkCode,
      canary: verification.canary,
      solutionIpynb: readFileSync(join(lab.dir, 'notebooks', 'solution.ipynb'), 'utf8'),
      labVersion: m.version,
    };
  }

  mkdirSync(join(GENERATED, 'server'), { recursive: true });
  writeFileSync(
    join(GENERATED, 'content.ts'),
    `${header()}import type { PublicExercise, PublicLesson, PublicObjective, PublicQuiz, PublicTrack } from '@/domain/content/public-types';
import type { PublicLab } from '@/domain/labs/types';

export const TRACKS: readonly PublicTrack[] = ${JSON.stringify(tracks, null, 2)};
export const OBJECTIVES: readonly PublicObjective[] = ${JSON.stringify(objectives, null, 2)};
export const LESSONS: readonly PublicLesson[] = ${JSON.stringify(lessons, null, 2)};
export const QUIZZES: readonly PublicQuiz[] = ${JSON.stringify(quizzes, null, 2)};
export const EXERCISES: readonly PublicExercise[] = ${JSON.stringify(exercises, null, 2)};
export const LABS: readonly PublicLab[] = ${JSON.stringify(publicLabs, null, 2)};
`,
  );
  writeFileSync(
    join(GENERATED, 'server', 'keys.ts'),
    `${header()}import 'server-only';
import type { QuizKeyQuestion } from '@/domain/quiz/grade';

export const KEYS_CANARY = 'CANARY-SERVER-KEYS-3f9c1a';
export const QUIZ_KEYS: Readonly<Record<string, readonly QuizKeyQuestion[]>> = ${JSON.stringify(quizKeys, null, 2)};
export const EXERCISE_KEYS: Readonly<Record<string, { readonly expectedHash: string; readonly ordered: boolean }>> = ${JSON.stringify(exerciseKeys, null, 2)};
export const LAB_KEYS: Readonly<Record<string, { readonly checkCode: string; readonly canary: string; readonly solutionIpynb: string; readonly labVersion: string }>> = ${JSON.stringify(labKeys, null, 2)};
`,
  );
  console.log(
    `✓ contenu compilé : ${String(tracks.length)} parcours, ${String(lessons.length)} leçons, ${String(exercises.length)} exercice(s), ${String(publicLabs.length)} lab(s)`,
  );
}

main();
