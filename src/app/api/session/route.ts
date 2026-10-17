import 'server-only';
import { z } from 'zod';
import { jsonResponse, route } from '@/server/route';
import {
  createSession,
  revokeSessions,
  SESSION_MAX_AGE_SECONDS,
  sessionCookieAttributes,
} from '@/server/session';
import { ensureProfile, readProfile } from '@/server/services/user-service';

export const dynamic = 'force-dynamic';

const body = z.object({ idToken: z.string().min(10).max(4096) }).strict();

export const POST = route(
  {
    name: 'session.create',
    auth: 'none',
    body,
    clientRateLimit: { limit: 20, windowSeconds: 600 },
  },
  async ({ body: input }) => {
    const { cookie, user } = await createSession(input.idToken);
    await ensureProfile(user);
    const response = jsonResponse({ user: await readProfile(user) });
    response.headers.append('set-cookie', sessionCookieAttributes(cookie, SESSION_MAX_AGE_SECONDS));
    return response;
  },
);

export const DELETE = route({ name: 'session.delete', auth: 'optional' }, async ({ user }) => {
  if (user !== null) await revokeSessions(user.uid);
  const response = jsonResponse({ ok: true });
  response.headers.append('set-cookie', sessionCookieAttributes('', 0));
  return response;
});
