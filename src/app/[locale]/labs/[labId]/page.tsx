import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { EnvironmentOption } from '@/components/labs/LabPanel';
import { LabPanel } from '@/components/labs/LabPanel';
import { resolveLocale } from '@/components/layout/locale-params';
import { LessonBody } from '@/components/lesson/LessonBody';
import styles from '@/components/lesson/lesson.module.css';
import { Badge } from '@/components/ui/primitives';
import { LOCALES } from '@/domain/i18n/locales';
import type { LabProviderId } from '@/domain/labs/manifest-schema';
import { LAB_PROVIDERS } from '@/domain/labs/providers';
import { FREE_EDITION_TERMS_NOTICE } from '@/domain/labs/terms';
import { messagesFor } from '@/i18n/messages';
import { allLabs, findLessonById } from '@/lib/content/catalog';
import { labMinStatus, visibleLab } from '@/server/visibility';

export const dynamicParams = false;

type Params = Promise<{ locale: string; labId: string }>;

export function generateStaticParams(): { locale: string; labId: string }[] {
  return LOCALES.flatMap((locale) =>
    allLabs()
      .filter((lab) => visibleLab(lab.manifest.id) !== undefined)
      .map((lab) => ({ locale, labId: lab.manifest.id })),
  );
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { labId } = await params;
  return { title: visibleLab(labId)?.manifest.title ?? 'TP' };
}

const ORDER: readonly LabProviderId[] = [
  'browser',
  'databricks-free-manual',
  'professional-workspace',
  'databricks-connected',
];

export default async function LabPage({ params }: { params: Params }) {
  const locale = await resolveLocale(params);
  const { labId } = await params;
  const lab = visibleLab(labId);
  if (lab === undefined) notFound();
  const t = messagesFor(locale);
  const min = labMinStatus();

  // Disponibilité calculée sans session : l'acceptation des conditions est vérifiée côté client,
  // puis de nouveau côté serveur à chaque déclaration.
  const options: EnvironmentOption[] = ORDER.map((id) => {
    const provider = LAB_PROVIDERS[id];
    const availability = provider.isAvailable(lab, {
      signedIn: false,
      isAnonymous: true,
      acceptedFreeEditionTermsVersion: null,
      minLabStatus: min,
    });
    const realStatus =
      id === 'databricks-free-manual' || id === 'professional-workspace' ? lab.status[id] : null;
    return {
      id,
      verification: provider.verification,
      available: availability.available,
      reason: availability.available ? null : availability.reason,
      instructions: provider.getInstructions(lab, locale),
      artifacts: provider.getArtifacts(lab),
      status: realStatus,
    };
  });

  const browserExerciseId = lab.manifest.environments.browser.exerciseId;
  const browserLesson = lab.manifest.lessonIds
    .map((id) => findLessonById(id))
    .find((l) => l !== undefined && l.exerciseId === browserExerciseId);

  return (
    <div className={styles.article} style={{ maxWidth: '60rem' }}>
      <nav className={styles.breadcrumb} aria-label="Fil d’Ariane">
        <Link href={`/${locale}/tracks/${lab.manifest.trackId}`}>{t.nav.tracks}</Link> › TP
      </nav>
      <h1>{lab.manifest.title}</h1>
      <div className={styles.meta}>
        <Badge>v{lab.manifest.version}</Badge>
        <Badge>
          {lab.manifest.durationMinutes} {t.track.minutes}
        </Badge>
        <Badge tone="info">{lab.manifest.data.rows.toLocaleString('fr-FR')} lignes générées</Badge>
      </div>
      <p>{lab.manifest.summary}</p>

      <LabPanel
        labId={lab.manifest.id}
        labVersion={lab.manifest.version}
        termsNotice={lab.manifest.termsNotice}
        terms={FREE_EDITION_TERMS_NOTICE}
        options={options}
        browserHref={
          browserLesson === undefined
            ? null
            : `/${locale}/tracks/${browserLesson.trackId}/${browserLesson.id}#exercise-${browserExerciseId ?? ''}`
        }
        t={t}
      />

      <section className={styles.block} aria-labelledby="procedure">
        <h2 id="procedure">{t.lab.procedure}</h2>
        <LessonBody source={lab.readmeFr.replace(/^# .*\n/, '')} />
      </section>
    </div>
  );
}
