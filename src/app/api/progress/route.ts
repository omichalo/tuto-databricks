import { ApiError } from '@/server/errors';
import { jsonResponse, route } from '@/server/route';
import { readTrackProgress } from '@/server/services/progress-service';

export const dynamic = 'force-dynamic';

export const GET = route({ name: 'progress.read', auth: 'required' }, async ({ request, user }) => {
  const trackId = new URL(request.url).searchParams.get('trackId');
  if (trackId === null || !/^[a-z0-9-]{1,64}$/.test(trackId)) {
    throw new ApiError('bad-request', 'trackId manquant ou invalide');
  }
  return jsonResponse(await readTrackProgress(user.uid, trackId));
});
