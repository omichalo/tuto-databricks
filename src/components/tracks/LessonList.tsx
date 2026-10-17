'use client';

import Link from 'next/link';
import type { Locale } from '@/domain/i18n/locales';
import type { Messages } from '@/i18n/messages';
import { useTrackProgress } from '@/lib/client/use-progress';
import { Badge, ProgressBar } from '@/components/ui/primitives';
import styles from './tracks.module.css';

export interface LessonListModule {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly lessons: readonly {
    readonly id: string;
    readonly title: string;
    readonly durationMinutes: number;
  }[];
}

export function LessonList({
  locale,
  trackId,
  modules,
  t,
}: {
  readonly locale: Locale;
  readonly trackId: string;
  readonly modules: readonly LessonListModule[];
  readonly t: Messages;
}) {
  const { progress } = useTrackProgress(trackId);
  const completed = new Set(
    progress?.lessons.filter((l) => l.status === 'completed').map((l) => l.lessonId) ?? [],
  );
  const total = modules.reduce((sum, m) => sum + m.lessons.length, 0);

  return (
    <div className="stack">
      {progress !== null && (
        <div>
          <p className="muted">
            {completed.size} / {total} {t.dashboard.lessonsCompleted}
          </p>
          <ProgressBar value={completed.size} max={total} label={t.dashboard.lessonsCompleted} />
        </div>
      )}
      {modules.map((module, index) => (
        <section key={module.id} className={styles.module}>
          <h2>
            {index + 1}. {module.title}
          </h2>
          <p className="muted">{module.summary}</p>
          <ol className={styles.lessons}>
            {module.lessons.map((lesson) => (
              <li key={lesson.id}>
                <Link href={`/${locale}/tracks/${trackId}/${lesson.id}`}>{lesson.title}</Link>
                <span className="muted">
                  {' '}
                  · {lesson.durationMinutes} {t.track.minutes}
                </span>{' '}
                {completed.has(lesson.id) && <Badge tone="success">✓ {t.lesson.completed}</Badge>}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
