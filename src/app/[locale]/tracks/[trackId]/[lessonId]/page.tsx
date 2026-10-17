import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SqlExercise } from '@/components/exercise/SqlExercise';
import { resolveLocale } from '@/components/layout/locale-params';
import { LessonActions } from '@/components/lesson/LessonActions';
import { LessonBody } from '@/components/lesson/LessonBody';
import styles from '@/components/lesson/lesson.module.css';
import { Quiz } from '@/components/lesson/Quiz';
import { ButtonLink } from '@/components/ui/Button';
import { Badge, Callout } from '@/components/ui/primitives';
import { isContentVisible } from '@/domain/content/status';
import { LOCALES } from '@/domain/i18n/locales';
import { messagesFor } from '@/i18n/messages';
import {
  exerciseById,
  findLesson,
  findTrack,
  labById,
  neighbours,
  objectivesOf,
  quizOf,
  visibleLessonsOfTrack,
  visibleTracks,
} from '@/lib/content/catalog';
import { contentMinStatus } from '@/server/visibility';

export const dynamicParams = false;

type Params = Promise<{ locale: string; trackId: string; lessonId: string }>;

export function generateStaticParams(): { locale: string; trackId: string; lessonId: string }[] {
  const min = contentMinStatus();
  return LOCALES.flatMap((locale) =>
    visibleTracks(min).flatMap((track) =>
      visibleLessonsOfTrack(track.id, min).map((lesson) => ({
        locale,
        trackId: track.id,
        lessonId: lesson.id,
      })),
    ),
  );
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, trackId, lessonId } = await params;
  const lesson = findLesson(trackId, lessonId);
  if (lesson === undefined) return {};
  return {
    title: lesson.title,
    description: lesson.summary,
    // Contenu EN non traduit : la version FR est canonique.
    alternates: { canonical: `/fr/tracks/${trackId}/${lessonId}` },
    ...(locale === 'en' ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function LessonPage({ params }: { params: Params }) {
  const locale = await resolveLocale(params);
  const { trackId, lessonId } = await params;
  const min = contentMinStatus();
  const track = findTrack(trackId);
  const lesson = findLesson(trackId, lessonId);
  if (track === undefined || lesson === undefined || !isContentVisible(lesson.status, min))
    notFound();

  const t = messagesFor(locale);
  const lessonModule = track.modules.find((m) => m.id === lesson.moduleId);
  const objectives = objectivesOf(lesson.objectiveIds);
  const quiz = quizOf(lesson.id);
  const exercise = lesson.exerciseId === null ? undefined : exerciseById(lesson.exerciseId);
  const lab = lesson.labId === null ? undefined : labById(lesson.labId);
  const { previous, next } = neighbours(trackId, lessonId, min);

  return (
    <div className={styles.layout}>
      <article className={styles.article} lang="fr">
        <nav className={styles.breadcrumb} aria-label="Fil d’Ariane">
          <Link href={`/${locale}/tracks/${track.id}`}>{track.title}</Link>
          {lessonModule !== undefined && <> › {lessonModule.title}</>}
        </nav>
        <h1>{lesson.title}</h1>
        <div className={styles.meta}>
          <Badge>
            {lesson.durationMinutes} {t.track.minutes}
          </Badge>
          {lesson.status === 'in-technical-review' && (
            <Badge tone="warning">{t.lesson.statusReview}</Badge>
          )}
          {lesson.status === 'draft' && <Badge tone="danger">{t.lesson.statusDraft}</Badge>}
          {lesson.verifiedOn !== null && (
            <Badge tone="info">
              {lesson.verifiedOn.platform} · {lesson.verifiedOn.date}
            </Badge>
          )}
        </div>

        <section className={styles.objectives} aria-labelledby="objectives">
          <h2 id="objectives">{t.lesson.objectives}</h2>
          <ul>
            {objectives.map((o) => (
              <li key={o.id}>{o.text}</li>
            ))}
          </ul>
        </section>

        <LessonBody source={lesson.bodyFr} />

        {exercise !== undefined && (
          <div className={styles.block}>
            <SqlExercise exercise={exercise} t={t} />
          </div>
        )}

        {lab !== undefined && (
          <div className={styles.block}>
            <Callout kind="info" title={`${t.lesson.practice} : ${lab.manifest.title}`}>
              <p>{lab.manifest.summary}</p>
              <ButtonLink href={`/${locale}/labs/${lab.manifest.id}`}>{t.lesson.labCta}</ButtonLink>
            </Callout>
          </div>
        )}

        {quiz !== undefined && (
          <div className={styles.block}>
            <Quiz quiz={quiz} t={t} />
          </div>
        )}

        <div className={styles.block}>
          <LessonActions trackId={track.id} lessonId={lesson.id} t={t} />
        </div>

        {lesson.sources.length > 0 && (
          <section className={`${styles.block} ${styles.sources}`} aria-labelledby="sources">
            <h2 id="sources">{t.lesson.sources}</h2>
            <ul>
              {lesson.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} rel="noopener noreferrer" target="_blank">
                    {s.title}
                  </a>{' '}
                  <span className="muted">
                    ({t.lesson.verifiedAt} {s.verifiedAt})
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <nav className={styles.pager} aria-label="Leçons">
          {previous === null ? (
            <span />
          ) : (
            <Link href={`/${locale}/tracks/${track.id}/${previous.id}`}>
              ← {t.lesson.previous} : {previous.title}
            </Link>
          )}
          {next !== null && (
            <Link href={`/${locale}/tracks/${track.id}/${next.id}`}>
              {t.lesson.next} : {next.title} →
            </Link>
          )}
        </nav>
      </article>

      {lesson.headings.length > 0 && (
        <aside className={styles.aside} aria-labelledby="toc">
          <p id="toc">
            <strong>{t.lesson.onThisPage}</strong>
          </p>
          <ul>
            {lesson.headings.map((h) => (
              <li key={h.id}>
                <a href={`#${h.id}`}>{h.text}</a>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
