import 'server-only';
import { isContentVisible } from '@/domain/content/status';
import type { LabStatus } from '@/domain/labs/manifest-schema';
import { findLessonById, labById } from '@/lib/content/catalog';
import type { PublicLab } from '@/domain/labs/types';
import type { PublicLesson } from '@/domain/content/public-types';
import { LESSONS } from '@/generated/content';
import { serverEnv } from './env';

export function contentMinStatus(): ReturnType<typeof serverEnv>['CONTENT_MIN_STATUS'] {
  return serverEnv().CONTENT_MIN_STATUS;
}

export function labMinStatus(): LabStatus {
  return serverEnv().LAB_MIN_STATUS;
}

/** Leçon accessible dans cet environnement, ou undefined (les API refusent les contenus masqués). */
export function visibleLesson(lessonId: string): PublicLesson | undefined {
  const lesson = findLessonById(lessonId);
  if (lesson === undefined || !isContentVisible(lesson.status, contentMinStatus()))
    return undefined;
  return lesson;
}

/** Un exercice est accessible si au moins une leçon visible l'utilise. */
export function isExerciseVisible(exerciseId: string): boolean {
  const min = contentMinStatus();
  return LESSONS.some((l) => l.exerciseId === exerciseId && isContentVisible(l.status, min));
}

/**
 * Une page de lab est accessible si une leçon visible y renvoie. La disponibilité de chaque
 * environnement réel dépend ensuite de LAB_MIN_STATUS (voir les fournisseurs).
 */
export function visibleLab(labId: string): PublicLab | undefined {
  const min = contentMinStatus();
  const referenced = LESSONS.some((l) => l.labId === labId && isContentVisible(l.status, min));
  return referenced ? labById(labId) : undefined;
}
