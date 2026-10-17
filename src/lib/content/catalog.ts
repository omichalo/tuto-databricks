import type {
  PublicExercise,
  PublicLesson,
  PublicObjective,
  PublicQuiz,
  PublicTrack,
} from '@/domain/content/public-types';
import type { ContentStatus } from '@/domain/content/status';
import { isContentVisible } from '@/domain/content/status';
import type { PublicLab } from '@/domain/labs/types';
import { EXERCISES, LABS, LESSONS, OBJECTIVES, QUIZZES, TRACKS } from '@/generated/content';

type MinStatus = Exclude<ContentStatus, 'deprecated'>;

export function visibleTracks(min: MinStatus): readonly PublicTrack[] {
  return TRACKS.filter((t) => visibleLessonsOfTrack(t.id, min).length > 0);
}

export function findTrack(trackId: string): PublicTrack | undefined {
  return TRACKS.find((t) => t.id === trackId);
}

export function findLesson(trackId: string, lessonId: string): PublicLesson | undefined {
  return LESSONS.find((l) => l.trackId === trackId && l.id === lessonId);
}

export function findLessonById(lessonId: string): PublicLesson | undefined {
  return LESSONS.find((l) => l.id === lessonId);
}

export function visibleLessonsOfTrack(trackId: string, min: MinStatus): readonly PublicLesson[] {
  const track = findTrack(trackId);
  if (track === undefined) return [];
  const order = track.modules.flatMap((m) => m.lessonIds);
  return order
    .map((id) => findLesson(trackId, id))
    .filter((l): l is PublicLesson => l !== undefined && isContentVisible(l.status, min));
}

export function objectivesOf(ids: readonly string[]): readonly PublicObjective[] {
  return ids
    .map((id) => OBJECTIVES.find((o) => o.id === id))
    .filter((o): o is PublicObjective => o !== undefined);
}

export function quizOf(lessonId: string): PublicQuiz | undefined {
  return QUIZZES.find((q) => q.lessonId === lessonId);
}

export function exerciseById(id: string): PublicExercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}

export function labById(id: string): PublicLab | undefined {
  return LABS.find((l) => l.manifest.id === id);
}

export function allLabs(): readonly PublicLab[] {
  return LABS;
}

/** Leçon suivante et précédente dans l'ordre du parcours, parmi les leçons visibles. */
export function neighbours(
  trackId: string,
  lessonId: string,
  min: MinStatus,
): { previous: PublicLesson | null; next: PublicLesson | null } {
  const lessons = visibleLessonsOfTrack(trackId, min);
  const index = lessons.findIndex((l) => l.id === lessonId);
  return {
    previous: index > 0 ? (lessons[index - 1] ?? null) : null,
    next: index >= 0 ? (lessons[index + 1] ?? null) : null,
  };
}
