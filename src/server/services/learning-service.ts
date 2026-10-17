import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import type { ExerciseResultDoc } from '@/domain/progress/model';
import { applyExerciseAttempt } from '@/domain/progress/model';
import type { QuizAnswers, QuizGrade } from '@/domain/quiz/grade';
import { gradeQuiz } from '@/domain/quiz/grade';
import { EXERCISE_KEYS, QUIZ_KEYS } from '@/generated/server/keys';
import { exerciseById } from '@/lib/content/catalog';
import { db } from '../firebase-admin';
import { ApiError } from '../errors';
import { decode, encode } from '../repositories/firestore-codec';
import { paths } from '../repositories/paths';
import { isExerciseVisible, visibleLesson } from '../visibility';
import { recordQuizScore } from './progress-service';

/** Quiz formatif : correction serveur, clés jamais envoyées avant la réponse. */
export async function checkQuiz(
  uid: string | null,
  lessonId: string,
  answers: QuizAnswers,
): Promise<QuizGrade & { readonly saved: boolean }> {
  const lesson = visibleLesson(lessonId);
  const key = QUIZ_KEYS[lessonId];
  if (lesson === undefined || key === undefined) throw new ApiError('not-found', 'Quiz inconnu');
  const grade = gradeQuiz(key, answers);
  if (uid === null) return { ...grade, saved: false };
  await recordQuizScore(uid, lesson.trackId, lessonId, grade.score, grade.maxScore);
  return { ...grade, saved: true };
}

function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Contrôle formatif d'un exercice SQL : le navigateur envoie l'empreinte de son résultat, le
 * serveur la compare à l'empreinte attendue, qu'il ne divulgue jamais. Ce n'est pas une preuve :
 * le résultat est enregistré `automatic-formative`, jamais comme une évaluation certifiante.
 */
export async function checkExercise(
  uid: string | null,
  exerciseId: string,
  resultHash: string,
  now = Date.now(),
): Promise<{
  readonly passed: boolean;
  readonly saved: boolean;
  readonly attempts: number | null;
}> {
  const exercise = exerciseById(exerciseId);
  const key = EXERCISE_KEYS[exerciseId];
  if (exercise === undefined || key === undefined || !isExerciseVisible(exerciseId)) {
    throw new ApiError('not-found', 'Exercice inconnu');
  }
  const passed = sameHash(resultHash, key.expectedHash);
  if (uid === null) return { passed, saved: false, attempts: null };
  const ref = paths.exerciseResult(uid, exerciseId);
  const next = await db().runTransaction(async (tx) => {
    const current = decode<ExerciseResultDoc>((await tx.get(ref)).data());
    const updated = applyExerciseAttempt(current, exerciseId, passed, now);
    tx.set(ref, encode(updated));
    return updated;
  });
  return { passed, saved: true, attempts: next.attempts };
}
