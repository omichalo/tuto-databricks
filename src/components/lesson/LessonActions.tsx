'use client';

import { useEffect, useState } from 'react';
import type { Messages } from '@/i18n/messages';
import { apiJson } from '@/lib/client/api';
import { useAuth } from '@/lib/client/auth-context';
import { useTrackProgress } from '@/lib/client/use-progress';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/primitives';
import styles from './interactive.module.css';

export function LessonActions({
  trackId,
  lessonId,
  t,
}: {
  readonly trackId: string;
  readonly lessonId: string;
  readonly t: Messages;
}) {
  const { status, ensureSession } = useAuth();
  const { progress, reload } = useTrackProgress(trackId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done =
    progress?.lessons.some((l) => l.lessonId === lessonId && l.status === 'completed') ?? false;

  useEffect(() => {
    // La visite n'est enregistrée que pour une session existante : consulter ne crée pas de compte.
    if (status !== 'signed-in') return;
    void apiJson('POST', '/api/progress/lessons', { trackId, lessonId, action: 'seen' }).catch(
      () => undefined,
    );
  }, [status, trackId, lessonId]);

  async function complete(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await ensureSession();
      await apiJson('POST', '/api/progress/lessons', { trackId, lessonId, action: 'complete' });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.actions}>
      {done ? (
        <Badge tone="success">✓ {t.lesson.completed}</Badge>
      ) : (
        <Button onClick={() => void complete()} disabled={busy}>
          {t.lesson.markComplete}
        </Button>
      )}
      {error !== null && (
        <span role="alert" className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
}
