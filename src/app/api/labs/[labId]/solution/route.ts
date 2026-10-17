import 'server-only';
import { z } from 'zod';
import { SELF_REPORT_PROVIDERS } from '@/domain/labs/providers';
import { ApiError } from '@/server/errors';
import { route } from '@/server/route';
import { readSolution } from '@/server/services/lab-service';

export const dynamic = 'force-dynamic';

const body = z.object({ provider: z.enum(SELF_REPORT_PROVIDERS) }).strict();

/** POST (et non GET) : la consultation du corrigé modifie la progression et ne doit pas être mise en cache. */
export const POST = route(
  { name: 'lab.solution', auth: 'required', body, rateLimit: { limit: 10, windowSeconds: 60 } },
  async ({ user, body: input, params }) => {
    const labId = params.labId;
    if (labId === undefined || !/^[a-z0-9-]{1,64}$/.test(labId)) {
      throw new ApiError('bad-request', 'Identifiant de TP invalide');
    }
    const notebook = await readSolution(user.uid, labId, input.provider);
    return new Response(notebook, {
      headers: {
        'content-type': 'application/x-ipynb+json; charset=utf-8',
        'content-disposition': `attachment; filename="${labId}-solution.ipynb"`,
        'cache-control': 'private, no-store',
      },
    });
  },
);
