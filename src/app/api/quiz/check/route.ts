import 'server-only';
import { z } from 'zod';
import { jsonResponse, route } from '@/server/route';
import { checkQuiz } from '@/server/services/learning-service';

export const dynamic = 'force-dynamic';

const choiceId = z.string().regex(/^[a-z0-9-]{1,32}$/);
const body = z
  .object({
    lessonId: z.string().regex(/^[a-z0-9-]{1,64}$/),
    answers: z
      .record(z.string().regex(/^[a-z0-9-]{1,64}$/), z.array(choiceId).max(10))
      .refine((a) => Object.keys(a).length <= 30, 'Trop de réponses'),
  })
  .strict();

export const POST = route(
  { name: 'quiz.check', auth: 'required', body, rateLimit: { limit: 20, windowSeconds: 60 } },
  async ({ user, body: input }) =>
    jsonResponse(await checkQuiz(user.uid, input.lessonId, input.answers)),
);
