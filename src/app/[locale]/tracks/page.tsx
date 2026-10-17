import type { Metadata } from 'next';
import { resolveLocale } from '@/components/layout/locale-params';
import { TrackCard } from '@/components/tracks/TrackCard';
import { messagesFor } from '@/i18n/messages';
import { visibleLessonsOfTrack, visibleTracks } from '@/lib/content/catalog';
import { contentMinStatus } from '@/server/visibility';
import styles from '../page.module.css';

export const metadata: Metadata = { title: 'Parcours' };

export default async function TracksPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const t = messagesFor(locale);
  const min = contentMinStatus();
  const tracks = visibleTracks(min);
  return (
    <>
      <h1>{t.nav.tracks}</h1>
      {tracks.length === 0 ? (
        <p className="muted">{t.dashboard.empty}</p>
      ) : (
        <div className={styles.grid}>
          {tracks.map((track) => (
            <TrackCard
              key={track.id}
              locale={locale}
              track={track}
              lessons={visibleLessonsOfTrack(track.id, min)}
            />
          ))}
        </div>
      )}
    </>
  );
}
