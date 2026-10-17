import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from './firebase-admin';
import { ApiError } from './errors';

export interface RateLimitRule {
  readonly limit: number;
  readonly windowSeconds: number;
}

/**
 * Fenêtre fixe par (utilisateur, route), stockée dans `rateLimits` avec un TTL.
 * Coût : 1 lecture et 1 écriture par appel limité ; réservé aux routes d'écriture.
 */
export async function enforceRateLimit(
  key: string,
  route: string,
  rule: RateLimitRule,
  now = Date.now(),
): Promise<void> {
  const windowStart = Math.floor(now / 1000 / rule.windowSeconds) * rule.windowSeconds;
  const safeKey = key.replace(/[^A-Za-z0-9_-]/g, '_');
  const ref = db()
    .collection('rateLimits')
    .doc(`${safeKey}_${route}_${String(windowStart)}`);
  const allowed = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = snap.exists ? Number(snap.get('count')) : 0;
    if (count >= rule.limit) return false;
    tx.set(ref, {
      count: count + 1,
      route,
      expireAt: Timestamp.fromMillis((windowStart + rule.windowSeconds) * 1000 + 60 * 60 * 1000),
    });
    return true;
  });
  if (!allowed) throw new ApiError('rate-limited', 'Trop de requêtes : réessayez dans un instant');
}
