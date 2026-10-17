import { z } from 'zod';
import { CONTENT_STATUSES, TRANSLATION_STATUSES } from './status';

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'identifiant en kebab-case attendu');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date ISO AAAA-MM-JJ attendue');
const officialUrl = z
  .url()
  .refine(
    (u) =>
      /^https:\/\/(docs\.databricks\.com|www\.databricks\.com|delta\.io|docs\.delta\.io|spark\.apache\.org|learn\.microsoft\.com|docs\.cloud\.google\.com|firebase\.google\.com)\//.test(
        u,
      ),
    'source officielle attendue',
  );

export const sourceSchema = z.object({
  title: z.string().min(3),
  url: officialUrl,
  verifiedAt: isoDate,
});

export const objectiveSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
  bloom: z.enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']),
  fr: z.string().min(10),
  en: z.string().min(10).optional(),
  sources: z.array(sourceSchema).min(1),
});
export type Objective = z.infer<typeof objectiveSchema>;

export const objectiveFileSchema = z.object({
  domain: slug,
  objectives: z.array(objectiveSchema).min(1),
});

export const lessonFrontmatterSchema = z
  .object({
    id: slug,
    title: z.string().min(5),
    summary: z.string().min(20),
    status: z.enum([...CONTENT_STATUSES, 'deprecated']),
    durationMinutes: z.number().int().min(5).max(120),
    objectiveIds: z.array(z.string()).min(2).max(5),
    sources: z.array(sourceSchema).min(1),
    translations: z.object({
      fr: z.literal('complete'),
      en: z.enum(TRANSLATION_STATUSES),
    }),
    exerciseId: slug.optional(),
    labId: slug.optional(),
    interactionWaiver: z.string().min(20).optional(),
    verifiedOn: z
      .object({ platform: z.enum(['duckdb', 'free-edition', 'dbr']), date: isoDate })
      .optional(),
  })
  .refine(
    (l) => l.exerciseId !== undefined || l.labId !== undefined || l.interactionWaiver !== undefined,
    'Définition de Done : interaction (exercice ou lab) ou dérogation justifiée obligatoire',
  );
export type LessonFrontmatter = z.infer<typeof lessonFrontmatterSchema>;

export const moduleSchema = z.object({
  id: slug,
  title: z.string().min(5),
  summary: z.string().min(20),
  lessons: z.array(slug).min(1),
});

export const trackSchema = z.object({
  id: slug,
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  title: z.string().min(5),
  summary: z.string().min(20),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  objectiveFiles: z.array(slug).min(1),
  modules: z.array(moduleSchema).min(1),
});
export type Track = z.infer<typeof trackSchema>;

const choiceSchema = z.object({
  id: z.string().regex(/^[a-z]$/),
  text: z.string().min(1),
  correct: z.boolean(),
  explanation: z.string().min(20),
});

export const quizQuestionSchema = z
  .object({
    id: slug,
    objectiveId: z.string(),
    kind: z.enum(['single', 'multiple']),
    prompt: z.string().min(10),
    code: z.string().optional(),
    choices: z.array(choiceSchema).min(2).max(6),
    sectionAnchor: z.string().optional(),
  })
  .refine((q) => q.choices.some((c) => c.correct), 'au moins une bonne réponse')
  .refine(
    (q) => q.kind === 'multiple' || q.choices.filter((c) => c.correct).length === 1,
    'question à choix unique : exactement une bonne réponse',
  );

export const quizFileSchema = z.object({
  lessonId: slug,
  questions: z.array(quizQuestionSchema).min(3),
});
export type QuizFile = z.infer<typeof quizFileSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

export const exerciseFileSchema = z.object({
  id: slug,
  title: z.string().min(5),
  objectiveIds: z.array(z.string()).min(1),
  statement: z.string().min(30),
  hints: z.array(z.string().min(5)).min(1),
  dataset: z.object({
    generator: z.string().regex(/^labs\/[a-z0-9-]+\/data\/[a-z0-9-]+\.sql$/),
    rows: z.number().int().min(10).max(50_000),
    table: z.string().regex(/^[a-z_][a-z0-9_]*$/),
  }),
  starterSql: z.string().min(5),
  ordered: z.boolean(),
  expectedShape: z.object({
    columns: z.array(z.string()).min(1),
    rowCount: z.number().int().min(0),
  }),
  expectedHash: z.string().regex(/^[a-f0-9]{64}$/),
  solutionSql: z.string().min(10),
  dialectNotes: z.array(z.string()).default([]),
});
export type ExerciseFile = z.infer<typeof exerciseFileSchema>;
