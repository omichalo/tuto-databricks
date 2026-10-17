import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveLocale } from '@/components/layout/locale-params';
import { LessonList } from '@/components/tracks/LessonList';
import { Badge } from '@/components/ui/primitives';
import { LOCALES } from '@/domain/i18n/locales';
import { messagesFor } from '@/i18n/messages';
import { findTrack, visibleLessonsOfTrack, visibleTracks } from '@/lib/content/catalog';
import { contentMinStatus } from '@/server/visibility';

export const dynamicParams = false;

type Params = Promise<{ locale: string; trackId: string }>;

export function generateStaticParams(): { locale: string; trackId: string }[] {
  return LOCALES.flatMap((locale) =>
    visibleTracks(contentMinStatus()).map((t) => ({ locale, trackId: t.id })),
  );
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { trackId } = await params;
  return { title: findTrack(trackId)?.title ?? 'Parcours' };
}

export default async function TrackPage({ params }: { params: Params }) {
  const locale = await resolveLocale(params);
  const { trackId } = await params;
  const track = findTrack(trackId);
  const min = contentMinStatus();
  const visible = visibleLessonsOfTrack(trackId, min);
  if (track === undefined || visible.length === 0) notFound();
  const t = messagesFor(locale);
  const visibleIds = new Set(visible.map((l) => l.id));
  const modules = track.modules
    .map((m) => ({
      id: m.id,
      title: m.title,
      summary: m.summary,
      lessons: visible
        .filter((l) => l.moduleId === m.id && visibleIds.has(l.id))
        .map((l) => ({ id: l.id, title: l.title, durationMinutes: l.durationMinutes })),
    }))
    .filter((m) => m.lessons.length > 0);

  return (
    <>
      <h1>{track.title}</h1>
      <p className="muted">{track.summary}</p>
      <p>
        <Badge tone="info">
          {t.track.level} : {track.level}
        </Badge>{' '}
        <Badge>v{track.version}</Badge>
      </p>
      <LessonList locale={locale} trackId={track.id} modules={modules} t={t} />
    </>
  );
}
