'use client';

import Link from 'next/link';
import type { Locale } from '@/domain/i18n/locales';
import type { Messages } from '@/i18n/messages';
import { useAuth } from '@/lib/client/auth-context';
import { useTrackProgress } from '@/lib/client/use-progress';
import { Badge, Card, ProgressBar } from '@/components/ui/primitives';
import styles from '@/app/[locale]/page.module.css';

export interface DashboardTrack {
  readonly id: string;
  readonly title: string;
  readonly lessons: readonly {
    readonly id: string;
    readonly title: string;
    readonly quizQuestionCount: number;
  }[];
  readonly exerciseIds: readonly string[];
  readonly labs: readonly { readonly id: string; readonly title: string }[];
}

function TrackDashboard({
  locale,
  track,
  t,
}: {
  readonly locale: Locale;
  readonly track: DashboardTrack;
  readonly t: Messages;
}) {
  const { progress } = useTrackProgress(track.id);
  if (progress === null) return <p className="muted">{t.common.loading}</p>;

  const completed = progress.lessons.filter((l) => l.status === 'completed').length;
  const quizzes = progress.lessons.filter((l) => l.quizBestScore !== null);
  const exercises = progress.exercises.filter((e) => track.exerciseIds.includes(e.exerciseId));
  const labs = progress.labs.filter((l) => track.labs.some((x) => x.id === l.labId));

  return (
    <section className="stack" aria-labelledby={`dash-${track.id}`}>
      <h2 id={`dash-${track.id}`}>
        <Link href={`/${locale}/tracks/${track.id}`}>{track.title}</Link>
      </h2>
      <div>
        <p className="muted">
          {completed} / {track.lessons.length} {t.dashboard.lessonsCompleted}
        </p>
        <ProgressBar
          value={completed}
          max={track.lessons.length}
          label={t.dashboard.lessonsCompleted}
        />
      </div>
      <div className={styles.grid}>
        <Card title={<>✓ {t.dashboard.verified}</>} headingLevel={3}>
          <p className="muted">{t.dashboard.verifiedHelp}</p>
          <ul>
            {quizzes.map((q) => (
              <li key={q.lessonId}>
                {t.dashboard.quizzes} «{' '}
                {track.lessons.find((l) => l.id === q.lessonId)?.title ?? q.lessonId} » :{' '}
                <Badge tone={q.quizBestScore === q.quizMaxScore ? 'success' : 'warning'}>
                  {q.quizBestScore} / {q.quizMaxScore}
                </Badge>
              </li>
            ))}
            {exercises.map((e) => (
              <li key={e.exerciseId}>
                {e.exerciseId} :{' '}
                <Badge tone={e.passed ? 'success' : 'neutral'}>
                  {e.passed ? '✓' : '…'} {e.attempts}×
                </Badge>
              </li>
            ))}
          </ul>
          {quizzes.length === 0 && exercises.length === 0 && (
            <p className="muted">{t.dashboard.empty}</p>
          )}
        </Card>
        <Card title={t.dashboard.declared} headingLevel={3}>
          <p className="muted">{t.dashboard.declaredHelp}</p>
          <ul>
            {labs.map((l) => (
              <li key={l.labId}>
                <Link href={`/${locale}/labs/${l.labId}`}>
                  {track.labs.find((x) => x.id === l.labId)?.title ?? l.labId}
                </Link>{' '}
                <Badge tone="declared">
                  {l.status === 'reported-completed' ? t.lab.selfReported : '…'} · {l.provider}
                </Badge>
                {l.cleanupConfirmed && <> · {t.dashboard.cleanup}</>}
                {l.checkCodeMatched === true && <> · {t.dashboard.code}</>}
              </li>
            ))}
          </ul>
          {labs.length === 0 && <p className="muted">{t.dashboard.empty}</p>}
        </Card>
      </div>
    </section>
  );
}

export function Dashboard({
  locale,
  tracks,
  t,
}: {
  readonly locale: Locale;
  readonly tracks: readonly DashboardTrack[];
  readonly t: Messages;
}) {
  const { status } = useAuth();
  if (status === 'loading') return <p className="muted">{t.common.loading}</p>;
  if (status === 'signed-out') return <p className="muted">{t.dashboard.signIn}</p>;
  return (
    <div className="stack">
      {tracks.map((track) => (
        <TrackDashboard key={track.id} locale={locale} track={track} t={t} />
      ))}
    </div>
  );
}
