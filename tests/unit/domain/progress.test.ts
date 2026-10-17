import { describe, expect, it } from 'vitest';
import type { LessonRef } from '@/domain/progress/model';
import {
  applyExerciseAttempt,
  applyLabOutcome,
  applyLessonCompleted,
  applyLessonSeen,
  applyQuizScore,
  applySolutionViewed,
  applyTrackCompletion,
  LAST_SEEN_DEBOUNCE_MS,
} from '@/domain/progress/model';
import type { LabOutcome } from '@/domain/labs/types';

const ref: LessonRef = { trackId: 't', moduleId: 'm', lessonId: 'l', contentVersion: '1.0.0' };
const T0 = 1_800_000_000_000;

describe('progression des leçons', () => {
  it('limite l’écriture des visites à une toutes les 10 minutes', () => {
    const first = applyLessonSeen(null, ref, T0);
    expect(first.changed).toBe(true);
    if (!first.changed) return;
    expect(applyLessonSeen(first.next, ref, T0 + LAST_SEEN_DEBOUNCE_MS - 1).changed).toBe(false);
    expect(applyLessonSeen(first.next, ref, T0 + LAST_SEEN_DEBOUNCE_MS).changed).toBe(true);
  });

  it('rend la complétion idempotente', () => {
    const done = applyLessonCompleted(null, ref, T0);
    expect(done.changed).toBe(true);
    if (!done.changed) return;
    expect(done.next).toMatchObject({
      status: 'completed',
      firstCompletedAt: T0,
      contentVersionAtCompletion: '1.0.0',
    });
    expect(applyLessonCompleted(done.next, ref, T0 + 1).changed).toBe(false);
  });

  it('une visite ne rétrograde pas une leçon terminée', () => {
    const done = applyLessonCompleted(null, ref, T0);
    if (!done.changed) throw new Error('attendu');
    const seen = applyLessonSeen(done.next, ref, T0 + LAST_SEEN_DEBOUNCE_MS * 2);
    if (!seen.changed) throw new Error('attendu');
    expect(seen.next.status).toBe('completed');
    expect(seen.next.firstCompletedAt).toBe(T0);
  });

  it('ne conserve que le meilleur score de quiz', () => {
    const first = applyQuizScore(null, ref, 2, 4, T0);
    if (!first.changed) throw new Error('attendu');
    expect(applyQuizScore(first.next, ref, 1, 4, T0 + 1).changed).toBe(false);
    expect(applyQuizScore(first.next, ref, 2, 4, T0 + 1).changed).toBe(false);
    const better = applyQuizScore(first.next, ref, 4, 4, T0 + 2);
    expect(better.changed && better.next.quizBestScore).toBe(4);
  });

  it('agrège la synthèse du parcours par module', () => {
    const one = applyTrackCompletion(null, ref, T0);
    const two = applyTrackCompletion(one, { ...ref, lessonId: 'l2' }, T0 + 5);
    expect(two).toMatchObject({
      completedCount: 2,
      enrolledAt: T0,
      lastActivityAt: T0 + 5,
      lastLessonId: 'l2',
    });
    expect(two.moduleSummary.m?.completed).toBe(2);
  });
});

describe('exercices', () => {
  it('compte les tentatives et n’oublie pas une réussite', () => {
    const a = applyExerciseAttempt(null, 'e', false, T0);
    const b = applyExerciseAttempt(a, 'e', true, T0 + 1);
    const c = applyExerciseAttempt(b, 'e', false, T0 + 2);
    expect(c).toMatchObject({
      attempts: 3,
      passed: true,
      firstPassedAt: T0 + 1,
      verificationKind: 'automatic-formative',
    });
  });
});

describe('TP auto-déclarés', () => {
  const outcome = (o: Partial<LabOutcome> = {}): LabOutcome => ({
    labId: 'lab',
    labVersion: '1.0.0',
    provider: 'databricks-free-manual',
    verificationKind: 'self-reported',
    status: 'reported-completed',
    checkCodeMatched: true,
    cleanupConfirmed: true,
    ...o,
  });

  it('refuse tout résultat qui ne serait pas auto-déclaré', () => {
    expect(() =>
      applyLabOutcome(null, outcome({ verificationKind: 'remote-verified' }), T0),
    ).toThrow();
    expect(() =>
      applyLabOutcome(null, outcome({ verificationKind: 'automatic-formative' }), T0),
    ).toThrow();
  });

  it('ne rétrograde jamais une déclaration de fin en « commencé »', () => {
    const done = applyLabOutcome(null, outcome(), T0);
    if (!done.changed) throw new Error('attendu');
    expect(applyLabOutcome(done.next, outcome({ status: 'started' }), T0 + 1).changed).toBe(false);
  });

  it('n’écrit pas une déclaration identique, mais accepte une correction', () => {
    const done = applyLabOutcome(null, outcome(), T0);
    if (!done.changed) throw new Error('attendu');
    expect(applyLabOutcome(done.next, outcome(), T0 + 1).changed).toBe(false);
    const fixed = applyLabOutcome(done.next, outcome({ checkCodeMatched: false }), T0 + 2);
    expect(fixed.changed && fixed.next.checkCodeMatched).toBe(false);
  });

  it('enregistre une seule fois la consultation du corrigé', () => {
    const base = {
      labId: 'lab',
      labVersion: '1.0.0',
      provider: 'databricks-free-manual',
      verificationKind: 'self-reported',
    } as const;
    const viewed = applySolutionViewed(null, base, T0);
    if (!viewed.changed) throw new Error('attendu');
    expect(viewed.next).toMatchObject({ solutionViewedAt: T0, status: 'started' });
    expect(applySolutionViewed(viewed.next, base, T0 + 1).changed).toBe(false);
    const reported = applyLabOutcome(viewed.next, outcome(), T0 + 2);
    expect(reported.changed && reported.next.solutionViewedAt).toBe(T0);
  });
});
