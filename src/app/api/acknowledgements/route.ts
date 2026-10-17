import 'server-only';
import { z } from 'zod';
import { jsonResponse, route } from '@/server/route';
import { acknowledgeFreeEditionTerms } from '@/server/services/user-service';

export const dynamic = 'force-dynamic';

const body = z
  .object({ kind: z.literal('free-edition-terms'), version: z.string().max(32) })
  .strict();

export const POST = route(
  { name: 'acknowledgement', auth: 'required', body, rateLimit: { limit: 10, windowSeconds: 60 } },
  async ({ user, body: input }) =>
    jsonResponse(await acknowledgeFreeEditionTerms(user.uid, input.version)),
);
