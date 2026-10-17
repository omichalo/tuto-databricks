import { jsonResponse, route } from '@/server/route';
import { readProfile } from '@/server/services/user-service';

export const dynamic = 'force-dynamic';

export const GET = route({ name: 'me.read', auth: 'optional' }, async ({ user }) =>
  jsonResponse({ user: user === null ? null : await readProfile(user) }),
);
