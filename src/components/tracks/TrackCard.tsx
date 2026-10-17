import Link from 'next/link';
import type { PublicLesson, PublicTrack } from '@/domain/content/public-types';
import type { Locale } from '@/domain/i18n/locales';
import { messagesFor } from '@/i18n/messages';
import { Badge, Card } from '@/components/ui/primitives';

export function TrackCard({
  locale,
  track,
  lessons,
}: {
  readonly locale: Locale;
  readonly track: PublicTrack;
  readonly lessons: readonly PublicLesson[];
}) {
  const t = messagesFor(locale);
  const minutes = lessons.reduce((sum, l) => sum + l.durationMinutes, 0);
  return (
    <Card
      as="article"
      headingLevel={3}
      title={<Link href={`/${locale}/tracks/${track.id}`}>{track.title}</Link>}
    >
      <p className="muted">{track.summary}</p>
      <p>
        <Badge tone="info">
          {t.track.level} : {track.level}
        </Badge>{' '}
        <Badge>
          {lessons.length} {t.track.lessons} · {minutes} {t.track.minutes}
        </Badge>
      </p>
    </Card>
  );
}
