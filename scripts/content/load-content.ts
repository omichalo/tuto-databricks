import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type {
  ExerciseFile,
  LessonFrontmatter,
  Objective,
  QuizFile,
  Track,
} from '../../src/domain/content/schema';
import {
  exerciseFileSchema,
  lessonFrontmatterSchema,
  objectiveFileSchema,
  quizFileSchema,
  trackSchema,
} from '../../src/domain/content/schema';
import { headingSlug } from '../../src/domain/content/slug';
import { ROOT } from '../labs/lab-files';

export const CONTENT_DIR = join(ROOT, 'content');

export interface LoadedLesson {
  readonly trackId: string;
  readonly moduleId: string;
  readonly frontmatter: LessonFrontmatter;
  readonly body: string;
  readonly headings: readonly { id: string; text: string }[];
  readonly quiz: QuizFile;
  readonly hasEnglish: boolean;
}

export interface LoadedContent {
  readonly tracks: readonly Track[];
  readonly objectives: ReadonlyMap<string, Objective>;
  readonly lessons: readonly LoadedLesson[];
  readonly exercises: ReadonlyMap<string, ExerciseFile>;
}

function parseOrThrow<T>(
  label: string,
  schema: {
    safeParse(
      v: unknown,
    ): { success: true; data: T } | { success: false; error: { message: string } };
  },
  value: unknown,
): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new Error(`${label} invalide :\n${result.error.message}`);
  return result.data;
}

export function splitFrontmatter(text: string): { data: unknown; body: string } {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text.replace(/\r\n/g, '\n'));
  if (match === null) throw new Error('frontmatter YAML manquant');
  return { data: parseYaml(match[1] ?? ''), body: (match[2] ?? '').trim() };
}

export function extractHeadings(body: string): { id: string; text: string }[] {
  const headings: { id: string; text: string }[] = [];
  let inCode = false;
  for (const line of body.split('\n')) {
    if (line.startsWith('```')) inCode = !inCode;
    if (inCode) continue;
    const m = /^(##|###) (.+)$/.exec(line);
    if (m?.[2] !== undefined) {
      const text = m[2].replace(/`/g, '').trim();
      headings.push({ id: headingSlug(text), text });
    }
  }
  return headings;
}

export function loadContent(): LoadedContent {
  const objectives = new Map<string, Objective>();
  for (const file of readdirSync(join(CONTENT_DIR, 'objectives')).filter((f) =>
    f.endsWith('.yaml'),
  )) {
    const parsed = parseOrThrow(
      `objectives/${file}`,
      objectiveFileSchema,
      parseYaml(readFileSync(join(CONTENT_DIR, 'objectives', file), 'utf8')),
    );
    for (const o of parsed.objectives) {
      if (objectives.has(o.id)) throw new Error(`objectif dupliqué : ${o.id}`);
      objectives.set(o.id, o);
    }
  }

  const exercises = new Map<string, ExerciseFile>();
  const exercisesDir = join(CONTENT_DIR, 'exercises');
  if (existsSync(exercisesDir)) {
    for (const id of readdirSync(exercisesDir).sort()) {
      const ex = parseOrThrow(
        `exercises/${id}`,
        exerciseFileSchema,
        parseYaml(readFileSync(join(exercisesDir, id, 'exercise.yaml'), 'utf8')),
      );
      if (ex.id !== id) throw new Error(`exercises/${id} : l'id doit égaler le nom du dossier`);
      exercises.set(id, ex);
    }
  }

  const tracks: Track[] = [];
  const lessons: LoadedLesson[] = [];
  for (const trackId of readdirSync(join(CONTENT_DIR, 'tracks')).sort()) {
    const trackDir = join(CONTENT_DIR, 'tracks', trackId);
    const track = parseOrThrow(
      `tracks/${trackId}/track.yaml`,
      trackSchema,
      parseYaml(readFileSync(join(trackDir, 'track.yaml'), 'utf8')),
    );
    if (track.id !== trackId)
      throw new Error(`tracks/${trackId} : l'id doit égaler le nom du dossier`);
    tracks.push(track);
    for (const mod of track.modules) {
      for (const lessonId of mod.lessons) {
        const base = join(trackDir, mod.id, lessonId);
        const label = `tracks/${trackId}/${mod.id}/${lessonId}`;
        const { data, body } = splitFrontmatter(readFileSync(`${base}.fr.mdx`, 'utf8'));
        const frontmatter = parseOrThrow(`${label}.fr.mdx`, lessonFrontmatterSchema, data);
        if (frontmatter.id !== lessonId) throw new Error(`${label} : id du frontmatter différent`);
        const quiz = parseOrThrow(
          `${label}.quiz.yaml`,
          quizFileSchema,
          parseYaml(readFileSync(`${base}.quiz.yaml`, 'utf8')),
        );
        lessons.push({
          trackId,
          moduleId: mod.id,
          frontmatter,
          body,
          headings: extractHeadings(body),
          quiz,
          hasEnglish: existsSync(`${base}.en.mdx`),
        });
      }
    }
  }
  return { tracks, objectives, lessons, exercises };
}

/** Contrôles de cohérence de la définition de Done vérifiables automatiquement. */
export function contentIntegrityErrors(
  content: LoadedContent,
  labIds: ReadonlySet<string>,
): string[] {
  const errors: string[] = [];
  const lessonIds = new Set<string>();
  for (const lesson of content.lessons) {
    const fm = lesson.frontmatter;
    const label = `${lesson.trackId}/${fm.id}`;
    if (lessonIds.has(fm.id)) errors.push(`${label} : identifiant de leçon dupliqué`);
    lessonIds.add(fm.id);
    for (const id of fm.objectiveIds) {
      if (!content.objectives.has(id)) errors.push(`${label} : objectif inconnu ${id}`);
    }
    if (fm.exerciseId !== undefined && !content.exercises.has(fm.exerciseId)) {
      errors.push(`${label} : exercice inconnu ${fm.exerciseId}`);
    }
    if (fm.labId !== undefined && !labIds.has(fm.labId))
      errors.push(`${label} : lab inconnu ${fm.labId}`);
    const anchors = new Set(lesson.headings.map((h) => h.id));
    const applyObjectives = fm.objectiveIds.filter((id) => {
      const bloom = content.objectives.get(id)?.bloom;
      return bloom !== undefined && !['remember', 'understand'].includes(bloom);
    });
    if (applyObjectives.length > 0 && fm.exerciseId === undefined && fm.labId === undefined) {
      errors.push(`${label} : objectif de niveau « appliquer » ou plus sans exercice ni lab`);
    }
    for (const q of lesson.quiz.questions) {
      if (!fm.objectiveIds.includes(q.objectiveId)) {
        errors.push(
          `${label} : question ${q.id} reliée à un objectif hors leçon (${q.objectiveId})`,
        );
      }
      if (q.sectionAnchor !== undefined && !anchors.has(q.sectionAnchor)) {
        errors.push(
          `${label} : question ${q.id} pointe vers une section inexistante (#${q.sectionAnchor})`,
        );
      }
    }
    if (/\b(TODO|TBD|lorem ipsum|XXX)\b/i.test(lesson.body) && fm.status === 'published') {
      errors.push(`${label} : espace réservé dans un contenu publié`);
    }
    if (fm.translations.en === 'complete' && !lesson.hasEnglish) {
      errors.push(`${label} : traduction EN déclarée complète mais fichier .en.mdx absent`);
    }
  }
  for (const track of content.tracks) {
    for (const mod of track.modules) {
      for (const id of mod.lessons) {
        if (!lessonIds.has(id)) errors.push(`${track.id}/${mod.id} : leçon ${id} introuvable`);
      }
    }
  }
  return errors;
}
