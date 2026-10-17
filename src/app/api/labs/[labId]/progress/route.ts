import 'server-only';
import { z } from 'zod';
import { SELF_REPORT_PROVIDERS } from '@/domain/labs/providers';
import { ApiError } from '@/server/errors';
import { jsonResponse, route } from '@/server/route';
import { readLabProgress, reportLab } from '@/server/services/lab-service';

export const dynamic = 'force-dynamic';

function labIdOf(params: Readonly<Record<string, string>>): string {
  const labId = params.labId;
  if (labId === undefined || !/^[a-z0-9-]{1,64}$/.test(labId)) {
    throw new ApiError('bad-request', 'Identifiant de TP invalide');
  }
  return labId;
}

const body = z
  .object({
    provider: z.enum(SELF_REPORT_PROVIDERS),
    completed: z.boolean(),
    checkCode: z.string().max(32).nullable(),
    cleanupConfirmed: z.boolean(),
  })
  .strict();

export const GET = route(
  { name: 'lab.progress.read', auth: 'required' },
  async ({ user, params }) =>
    jsonResponse({ progress: await readLabProgress(user.uid, labIdOf(params)) }),
);

export const POST = route(
  {
    name: 'lab.progress.report',
    auth: 'required',
    body,
    rateLimit: { limit: 10, windowSeconds: 60 },
  },
  async ({ user, body: input, params }) =>
    jsonResponse(await reportLab(user.uid, labIdOf(params), input)),
);
