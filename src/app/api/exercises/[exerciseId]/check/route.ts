import { z } from 'zod';
import { ApiError } from '@/server/errors';
import { jsonResponse, route } from '@/server/route';
import { checkExercise } from '@/server/services/learning-service';

export const dynamic = 'force-dynamic';

const body = z.object({ resultHash: z.string().regex(/^[a-f0-9]{64}$/) }).strict();

export const POST = route(
  { name: 'exercise.check', auth: 'required', body, rateLimit: { limit: 30, windowSeconds: 60 } },
  async ({ user, body: input, params }) => {
    const exerciseId = params.exerciseId;
    if (exerciseId === undefined || !/^[a-z0-9-]{1,64}$/.test(exerciseId)) {
      throw new ApiError('bad-request', 'Identifiant d’exercice invalide');
    }
    return jsonResponse(await checkExercise(user.uid, exerciseId, input.resultHash));
  },
);
