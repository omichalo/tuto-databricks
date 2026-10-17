'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  ExerciseResultDoc,
  LabProgressDoc,
  LessonProgressDoc,
  TrackProgressDoc,
} from '@/domain/progress/model';
import { apiJson } from './api';
import { useAuth } from './auth-context';

export interface TrackProgressView {
  readonly track: TrackProgressDoc | null;
  readonly lessons: readonly LessonProgressDoc[];
  readonly exercises: readonly ExerciseResultDoc[];
  readonly labs: readonly LabProgressDoc[];
}

export function useTrackProgress(trackId: string): {
  readonly progress: TrackProgressView | null;
  readonly reload: () => Promise<void>;
} {
  const { status } = useAuth();
  const [progress, setProgress] = useState<TrackProgressView | null>(null);

  const reload = useCallback(async () => {
    if (status !== 'signed-in') {
      setProgress(null);
      return;
    }
    try {
      setProgress(
        await apiJson<TrackProgressView>(
          'GET',
          `/api/progress?trackId=${encodeURIComponent(trackId)}`,
        ),
      );
    } catch {
      setProgress(null);
    }
  }, [status, trackId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { progress, reload };
}
