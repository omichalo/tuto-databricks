import { resolveLocale } from '@/components/layout/locale-params';
import { TrackCard } from '@/components/tracks/TrackCard';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/primitives';
import { messagesFor } from '@/i18n/messages';
import { visibleLessonsOfTrack, visibleTracks } from '@/lib/content/catalog';
import { contentMinStatus } from '@/server/visibility';
import styles from './page.module.css';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const t = messagesFor(locale);
  const min = contentMinStatus();
  const tracks = visibleTracks(min);
  const first = tracks[0];
  const firstLesson = first === undefined ? undefined : visibleLessonsOfTrack(first.id, min)[0];

  return (
    <>
      <section className={styles.hero}>
        <h1>{t.home.title}</h1>
        <p className={styles.lead}>{t.home.lead}</p>
        <div className={styles.actions}>
          {first !== undefined && firstLesson !== undefined && (
            <ButtonLink href={`/${locale}/tracks/${first.id}/${firstLesson.id}`}>
              {t.home.start}
            </ButtonLink>
          )}
          <ButtonLink href={`/${locale}/tracks`} variant="secondary">
            {t.home.browse}
          </ButtonLink>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ways">
        <h2 id="ways">{t.home.waysTitle}</h2>
        <div className={styles.grid}>
          {t.home.ways.map((way) => (
            <Card key={way.title} title={way.title} as="article" headingLevel={3}>
              <p className="muted">{way.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {tracks.length > 0 && (
        <section className={styles.section} aria-labelledby="tracks">
          <h2 id="tracks">{t.nav.tracks}</h2>
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
        </section>
      )}

      <section className={styles.section} aria-labelledby="honesty">
        <h2 id="honesty">{t.home.honestyTitle}</h2>
        <p className="muted">{t.home.honesty}</p>
      </section>
    </>
  );
}
