import type { Metadata } from 'next';
import type { DashboardTrack } from '@/components/dashboard/Dashboard';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { resolveLocale } from '@/components/layout/locale-params';
import { messagesFor } from '@/i18n/messages';
import { labById, visibleLessonsOfTrack, visibleTracks } from '@/lib/content/catalog';
import { contentMinStatus } from '@/server/visibility';

export const metadata: Metadata = { title: 'Ma progression', robots: { index: false } };

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const t = messagesFor(locale);
  const min = contentMinStatus();
  const tracks: DashboardTrack[] = visibleTracks(min).map((track) => {
    const lessons = visibleLessonsOfTrack(track.id, min);
    const labIds = [
      ...new Set(lessons.map((l) => l.labId).filter((id): id is string => id !== null)),
    ];
    return {
      id: track.id,
      title: track.title,
      lessons: lessons.map((l) => ({
        id: l.id,
        title: l.title,
        quizQuestionCount: l.quizQuestionCount,
      })),
      exerciseIds: lessons.map((l) => l.exerciseId).filter((id): id is string => id !== null),
      labs: labIds.map((id) => ({ id, title: labById(id)?.manifest.title ?? id })),
    };
  });
  return (
    <>
      <h1>{t.dashboard.title}</h1>
      <Dashboard locale={locale} tracks={tracks} t={t} />
    </>
  );
}
