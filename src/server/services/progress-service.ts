import 'server-only';
import type {
  LessonProgressDoc,
  LessonRef,
  TrackProgressDoc,
  ExerciseResultDoc,
  LabProgressDoc,
} from '@/domain/progress/model';
import {
  applyLessonCompleted,
  applyLessonSeen,
  applyQuizScore,
  applyTrackCompletion,
} from '@/domain/progress/model';
import { findTrack } from '@/lib/content/catalog';
import { db } from '../firebase-admin';
import { ApiError } from '../errors';
import { decode, encode } from '../repositories/firestore-codec';
import { paths } from '../repositories/paths';
import { visibleLesson } from '../visibility';

function lessonRef(trackId: string, lessonId: string): LessonRef {
  const lesson = visibleLesson(lessonId);
  const track = findTrack(trackId);
  if (lesson?.trackId !== trackId || track === undefined) {
    throw new ApiError('not-found', 'Leçon inconnue');
  }
  return { trackId, moduleId: lesson.moduleId, lessonId, contentVersion: track.version };
}

export interface WriteResult {
  readonly written: boolean;
}

/** Visite d'une leçon : au plus une écriture toutes les 10 minutes. */
export async function recordLessonSeen(
  uid: string,
  trackId: string,
  lessonId: string,
  now = Date.now(),
): Promise<WriteResult> {
  const ref = lessonRef(trackId, lessonId);
  const docRef = paths.lessonProgress(uid, trackId, lessonId);
  return db().runTransaction(async (tx) => {
    const current = decode<LessonProgressDoc>((await tx.get(docRef)).data());
    const mutation = applyLessonSeen(current, ref, now);
    if (!mutation.changed) return { written: false };
    tx.set(docRef, encode(mutation.next));
    return { written: true };
  });
}

/**
 * Complétion idempotente : si la leçon est déjà terminée, aucune écriture.
 * Sinon, le détail et la synthèse du parcours sont écrits dans la même transaction.
 */
export async function completeLesson(
  uid: string,
  trackId: string,
  lessonId: string,
  now = Date.now(),
): Promise<WriteResult> {
  const ref = lessonRef(trackId, lessonId);
  const lessonDoc = paths.lessonProgress(uid, trackId, lessonId);
  const trackDoc = paths.trackProgress(uid, trackId);
  return db().runTransaction(async (tx) => {
    const [lessonSnap, trackSnap] = await Promise.all([tx.get(lessonDoc), tx.get(trackDoc)]);
    const mutation = applyLessonCompleted(decode<LessonProgressDoc>(lessonSnap.data()), ref, now);
    if (!mutation.changed) return { written: false };
    const track = applyTrackCompletion(decode<TrackProgressDoc>(trackSnap.data()), ref, now);
    tx.set(lessonDoc, encode(mutation.next));
    tx.set(trackDoc, encode(track));
    return { written: true };
  });
}

export async function recordQuizScore(
  uid: string,
  trackId: string,
  lessonId: string,
  score: number,
  maxScore: number,
  now = Date.now(),
): Promise<WriteResult> {
  const ref = lessonRef(trackId, lessonId);
  const docRef = paths.lessonProgress(uid, trackId, lessonId);
  return db().runTransaction(async (tx) => {
    const mutation = applyQuizScore(
      decode<LessonProgressDoc>((await tx.get(docRef)).data()),
      ref,
      score,
      maxScore,
      now,
    );
    if (!mutation.changed) return { written: false };
    tx.set(docRef, encode(mutation.next));
    return { written: true };
  });
}

export interface TrackProgressView {
  readonly track: TrackProgressDoc | null;
  readonly lessons: readonly LessonProgressDoc[];
  readonly exercises: readonly ExerciseResultDoc[];
  readonly labs: readonly LabProgressDoc[];
}

/** Lecture d'un parcours : 1 synthèse + K détails + résultats d'exercices et de labs du parcours. */
export async function readTrackProgress(uid: string, trackId: string): Promise<TrackProgressView> {
  if (findTrack(trackId) === undefined) throw new ApiError('not-found', 'Parcours inconnu');
  const user = paths.user(uid);
  const [trackSnap, lessonsSnap, exercisesSnap, labsSnap] = await Promise.all([
    paths.trackProgress(uid, trackId).get(),
    user.collection('lessonProgress').where('trackId', '==', trackId).get(),
    user.collection('exerciseResults').get(),
    user.collection('labProgress').get(),
  ]);
  return {
    track: decode<TrackProgressDoc>(trackSnap.data()),
    lessons: lessonsSnap.docs
      .map((d) => decode<LessonProgressDoc>(d.data()))
      .filter((d): d is LessonProgressDoc => d !== null),
    exercises: exercisesSnap.docs
      .map((d) => decode<ExerciseResultDoc>(d.data()))
      .filter((d): d is ExerciseResultDoc => d !== null),
    labs: labsSnap.docs
      .map((d) => decode<LabProgressDoc>(d.data()))
      .filter((d): d is LabProgressDoc => d !== null),
  };
}
