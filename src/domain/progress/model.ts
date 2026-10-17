import type { LabOutcome } from '../labs/types';

export const PROGRESS_SCHEMA_VERSION = 1;
export const LAST_SEEN_DEBOUNCE_MS = 10 * 60 * 1000;

/** Horodatage sérialisable (millisecondes epoch) : le dépôt convertit vers/depuis Timestamp. */
export type EpochMs = number;

export interface LessonProgressDoc {
  readonly trackId: string;
  readonly moduleId: string;
  readonly lessonId: string;
  readonly status: 'started' | 'completed';
  readonly firstCompletedAt: EpochMs | null;
  readonly lastSeenAt: EpochMs;
  readonly contentVersionAtCompletion: string | null;
  readonly quizBestScore: number | null;
  readonly quizMaxScore: number | null;
  readonly schemaVersion: number;
}

export interface ModuleSummary {
  readonly completed: number;
}

export interface TrackProgressDoc {
  readonly trackId: string;
  readonly contentVersion: string;
  readonly enrolledAt: EpochMs;
  readonly lastActivityAt: EpochMs;
  readonly lastLessonId: string;
  readonly completedCount: number;
  readonly moduleSummary: Readonly<Record<string, ModuleSummary>>;
  readonly schemaVersion: number;
}

export interface ExerciseResultDoc {
  readonly exerciseId: string;
  readonly verificationKind: 'automatic-formative';
  readonly passed: boolean;
  readonly attempts: number;
  readonly firstPassedAt: EpochMs | null;
  readonly lastAttemptAt: EpochMs;
  readonly schemaVersion: number;
}

export interface LabProgressDoc extends LabOutcome {
  readonly startedAt: EpochMs;
  readonly reportedAt: EpochMs | null;
  readonly solutionViewedAt: EpochMs | null;
  readonly schemaVersion: number;
}

export function lessonProgressId(trackId: string, lessonId: string): string {
  return `${trackId}__${lessonId}`;
}

export interface LessonRef {
  readonly trackId: string;
  readonly moduleId: string;
  readonly lessonId: string;
  readonly contentVersion: string;
}

export type Mutation<T> =
  { readonly changed: false } | { readonly changed: true; readonly next: T };

/** Enregistre une visite ; n'écrit qu'au plus une fois toutes les 10 minutes. */
export function applyLessonSeen(
  current: LessonProgressDoc | null,
  ref: LessonRef,
  now: EpochMs,
): Mutation<LessonProgressDoc> {
  if (current !== null && now - current.lastSeenAt < LAST_SEEN_DEBOUNCE_MS)
    return { changed: false };
  return {
    changed: true,
    next: {
      trackId: ref.trackId,
      moduleId: ref.moduleId,
      lessonId: ref.lessonId,
      status: current?.status ?? 'started',
      firstCompletedAt: current?.firstCompletedAt ?? null,
      lastSeenAt: now,
      contentVersionAtCompletion: current?.contentVersionAtCompletion ?? null,
      quizBestScore: current?.quizBestScore ?? null,
      quizMaxScore: current?.quizMaxScore ?? null,
      schemaVersion: PROGRESS_SCHEMA_VERSION,
    },
  };
}

/** Marque une leçon terminée. Idempotent : aucune écriture si elle l'est déjà. */
export function applyLessonCompleted(
  current: LessonProgressDoc | null,
  ref: LessonRef,
  now: EpochMs,
): Mutation<LessonProgressDoc> {
  if (current?.status === 'completed') return { changed: false };
  return {
    changed: true,
    next: {
      trackId: ref.trackId,
      moduleId: ref.moduleId,
      lessonId: ref.lessonId,
      status: 'completed',
      firstCompletedAt: now,
      lastSeenAt: now,
      contentVersionAtCompletion: ref.contentVersion,
      quizBestScore: current?.quizBestScore ?? null,
      quizMaxScore: current?.quizMaxScore ?? null,
      schemaVersion: PROGRESS_SCHEMA_VERSION,
    },
  };
}

/** Conserve le meilleur score du quiz formatif ; aucune écriture s'il n'est pas amélioré. */
export function applyQuizScore(
  current: LessonProgressDoc | null,
  ref: LessonRef,
  score: number,
  maxScore: number,
  now: EpochMs,
): Mutation<LessonProgressDoc> {
  if (current?.quizBestScore !== null && current?.quizBestScore !== undefined) {
    if (current.quizBestScore >= score) return { changed: false };
  }
  return {
    changed: true,
    next: {
      trackId: ref.trackId,
      moduleId: ref.moduleId,
      lessonId: ref.lessonId,
      status: current?.status ?? 'started',
      firstCompletedAt: current?.firstCompletedAt ?? null,
      lastSeenAt: now,
      contentVersionAtCompletion: current?.contentVersionAtCompletion ?? null,
      quizBestScore: score,
      quizMaxScore: maxScore,
      schemaVersion: PROGRESS_SCHEMA_VERSION,
    },
  };
}

/** Met à jour la synthèse du parcours après une première complétion de leçon. */
export function applyTrackCompletion(
  current: TrackProgressDoc | null,
  ref: LessonRef,
  now: EpochMs,
): TrackProgressDoc {
  const moduleSummary = { ...(current?.moduleSummary ?? {}) };
  const previous = moduleSummary[ref.moduleId]?.completed ?? 0;
  moduleSummary[ref.moduleId] = { completed: previous + 1 };
  return {
    trackId: ref.trackId,
    contentVersion: ref.contentVersion,
    enrolledAt: current?.enrolledAt ?? now,
    lastActivityAt: now,
    lastLessonId: ref.lessonId,
    completedCount: (current?.completedCount ?? 0) + 1,
    moduleSummary,
    schemaVersion: PROGRESS_SCHEMA_VERSION,
  };
}

export function applyExerciseAttempt(
  current: ExerciseResultDoc | null,
  exerciseId: string,
  passed: boolean,
  now: EpochMs,
): ExerciseResultDoc {
  const alreadyPassed = current?.passed === true;
  return {
    exerciseId,
    verificationKind: 'automatic-formative',
    passed: alreadyPassed || passed,
    attempts: (current?.attempts ?? 0) + 1,
    firstPassedAt: current?.firstPassedAt ?? (passed ? now : null),
    lastAttemptAt: now,
    schemaVersion: PROGRESS_SCHEMA_VERSION,
  };
}

/**
 * Applique un résultat de lab auto-déclaré. Une déclaration de fin n'est jamais rétrogradée en
 * "started" ; une nouvelle déclaration remplace la précédente (code, nettoyage).
 */
export function applyLabOutcome(
  current: LabProgressDoc | null,
  outcome: LabOutcome,
  now: EpochMs,
): Mutation<LabProgressDoc> {
  if (outcome.verificationKind !== 'self-reported') {
    throw new Error('labProgress ne stocke que des résultats auto-déclarés');
  }
  if (outcome.status === 'started') {
    if (current !== null) return { changed: false };
    return {
      changed: true,
      next: {
        ...outcome,
        startedAt: now,
        reportedAt: null,
        solutionViewedAt: null,
        schemaVersion: PROGRESS_SCHEMA_VERSION,
      },
    };
  }
  if (
    current?.status === 'reported-completed' &&
    current.labVersion === outcome.labVersion &&
    current.provider === outcome.provider &&
    current.checkCodeMatched === outcome.checkCodeMatched &&
    current.cleanupConfirmed === outcome.cleanupConfirmed
  ) {
    return { changed: false };
  }
  return {
    changed: true,
    next: {
      ...outcome,
      startedAt: current?.startedAt ?? now,
      reportedAt: now,
      solutionViewedAt: current?.solutionViewedAt ?? null,
      schemaVersion: PROGRESS_SCHEMA_VERSION,
    },
  };
}

export function applySolutionViewed(
  current: LabProgressDoc | null,
  base: Omit<LabOutcome, 'status' | 'checkCodeMatched' | 'cleanupConfirmed'>,
  now: EpochMs,
): Mutation<LabProgressDoc> {
  if (current?.solutionViewedAt !== null && current?.solutionViewedAt !== undefined) {
    return { changed: false };
  }
  if (current !== null) {
    return { changed: true, next: { ...current, solutionViewedAt: now } };
  }
  return {
    changed: true,
    next: {
      ...base,
      status: 'started',
      checkCodeMatched: null,
      cleanupConfirmed: false,
      startedAt: now,
      reportedAt: null,
      solutionViewedAt: now,
      schemaVersion: PROGRESS_SCHEMA_VERSION,
    },
  };
}
