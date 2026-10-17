import { z } from 'zod';
import { jsonResponse, route } from '@/server/route';
import { completeLesson, recordLessonSeen } from '@/server/services/progress-service';

export const dynamic = 'force-dynamic';

const id = z.string().regex(/^[a-z0-9-]{1,64}$/);
const body = z.object({ trackId: id, lessonId: id, action: z.enum(['seen', 'complete']) }).strict();

export const POST = route(
  { name: 'progress.lesson', auth: 'required', body, rateLimit: { limit: 60, windowSeconds: 60 } },
  async ({ user, body: input }) => {
    const result =
      input.action === 'complete'
        ? await completeLesson(user.uid, input.trackId, input.lessonId)
        : await recordLessonSeen(user.uid, input.trackId, input.lessonId);
    return jsonResponse(result);
  },
);
