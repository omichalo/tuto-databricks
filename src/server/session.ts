import 'server-only';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from './firebase-admin';
import { ApiError } from './errors';
import { serverEnv } from './env';

/** Nom imposé par Firebase App Hosting : seul ce cookie est transmis par le CDN au serveur. */
export const SESSION_COOKIE = '__session';
export const SESSION_MAX_AGE_SECONDS = 5 * 24 * 60 * 60;
const RECENT_SIGN_IN_SECONDS = 5 * 60;

export interface SessionUser {
  readonly uid: string;
  readonly isAnonymous: boolean;
  readonly provider: string;
  readonly displayName: string | null;
}

function toSessionUser(token: DecodedIdToken): SessionUser {
  const provider = token.firebase.sign_in_provider;
  const name: unknown = token.name;
  return {
    uid: token.uid,
    isAnonymous: provider === 'anonymous',
    provider,
    displayName: typeof name === 'string' ? name.slice(0, 40) : null,
  };
}

/**
 * Échange un jeton d'identification contre un cookie de session.
 * Pour un compte permanent, la connexion doit dater de moins de 5 minutes (recommandation Firebase).
 * Un compte anonyme n'a pas de « reconnexion » possible : l'exiger lui ferait perdre sa progression.
 */
export async function createSession(
  idToken: string,
): Promise<{ cookie: string; user: SessionUser }> {
  let decoded: DecodedIdToken;
  try {
    decoded = await adminAuth().verifyIdToken(idToken, true);
  } catch {
    throw new ApiError('unauthenticated', 'Jeton d’identification invalide ou révoqué');
  }
  const user = toSessionUser(decoded);
  const ageSeconds = Date.now() / 1000 - decoded.auth_time;
  if (!user.isAnonymous && ageSeconds > RECENT_SIGN_IN_SECONDS) {
    throw new ApiError('reauthentication-required', 'Connexion trop ancienne : reconnectez-vous');
  }
  const cookie = await adminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
  });
  return { cookie, user };
}

export async function verifySession(cookie: string | undefined): Promise<SessionUser | null> {
  if (cookie === undefined || cookie === '') return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(cookie, true);
    return toSessionUser(decoded);
  } catch {
    return null;
  }
}

export async function revokeSessions(uid: string): Promise<void> {
  await adminAuth().revokeRefreshTokens(uid);
}

export function sessionCookieAttributes(value: string, maxAgeSeconds: number): string {
  const secure =
    serverEnv().APP_ENV === 'local' || serverEnv().APP_ENV === 'test' ? '' : '; Secure';
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${String(maxAgeSeconds)}${secure}`;
}
