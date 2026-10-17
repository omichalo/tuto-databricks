import 'server-only';
import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import { adminAppCheck } from './firebase-admin';
import { ApiError } from './errors';
import { serverEnv } from './env';
import { logger } from './logger';
import type { RateLimitRule } from './rate-limit';
import { enforceRateLimit } from './rate-limit';
import type { SessionUser } from './session';
import { SESSION_COOKIE, verifySession } from './session';

type AuthMode = 'required' | 'optional' | 'none';

export interface RouteOptions<TBody> {
  readonly name: string;
  readonly auth: AuthMode;
  readonly body?: z.ZodType<TBody>;
  readonly rateLimit?: RateLimitRule;
}

export interface RouteContext<TBody, TUser> {
  readonly request: Request;
  readonly requestId: string;
  readonly user: TUser;
  readonly body: TBody;
  readonly params: Readonly<Record<string, string>>;
}

export interface NextRouteContext {
  readonly params: Promise<Record<string, string>>;
}

type UserFor<A extends AuthMode> = A extends 'required' ? SessionUser : SessionUser | null;

const MAX_BODY_BYTES = 16 * 1024;
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie');
  if (header === null) return undefined;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return undefined;
}

function checkOrigin(request: Request): void {
  if (!MUTATING.has(request.method)) return;
  const env = serverEnv();
  const origin = request.headers.get('origin');
  const allowed = new Set<string>();
  if (env.APP_ORIGIN !== undefined) allowed.add(new URL(env.APP_ORIGIN).origin);
  if (env.APP_ENV === 'local' || env.APP_ENV === 'test') {
    allowed.add('http://localhost:3000');
    allowed.add('http://127.0.0.1:3000');
  }
  if (origin === null || !allowed.has(origin)) {
    throw new ApiError('origin-rejected', 'Origine de la requête non autorisée');
  }
}

async function checkAppCheck(request: Request): Promise<void> {
  if (!serverEnv().APP_CHECK_ENFORCED) return;
  const token = request.headers.get('x-firebase-appcheck');
  if (token === null || token === '')
    throw new ApiError('app-check-failed', 'Jeton App Check manquant');
  try {
    await adminAppCheck().verifyToken(token);
  } catch {
    throw new ApiError('app-check-failed', 'Jeton App Check invalide');
  }
}

async function parseBody<TBody>(
  request: Request,
  schema: z.ZodType<TBody> | undefined,
): Promise<TBody> {
  if (schema === undefined) return undefined as TBody;
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES)
    throw new ApiError('bad-request', 'Corps de requête trop volumineux');
  let json: unknown;
  try {
    json = text === '' ? {} : JSON.parse(text);
  } catch {
    throw new ApiError('bad-request', 'JSON invalide');
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ApiError('bad-request', 'Requête invalide');
  return parsed.data;
}

export function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'private, no-store');
  return new Response(JSON.stringify(data), { ...init, headers });
}

/**
 * Chaîne d'autorisation commune à toutes les routes API :
 * Origin, App Check, session (révocation vérifiée), validation Zod, quota, puis gestionnaire et log.
 * App Check n'est qu'une protection contre l'abus : il ne remplace jamais la session ni les quotas.
 */
export function route<TBody, A extends AuthMode>(
  options: RouteOptions<TBody> & { readonly auth: A },
  handler: (ctx: RouteContext<TBody, UserFor<A>>) => Promise<Response>,
): (request: Request, context: NextRouteContext) => Promise<Response> {
  return async (request: Request, context: NextRouteContext) => {
    const requestId = randomUUID();
    const started = Date.now();
    let uid: string | null = null;
    try {
      checkOrigin(request);
      await checkAppCheck(request);
      const user =
        options.auth === 'none' ? null : await verifySession(readCookie(request, SESSION_COOKIE));
      if (options.auth === 'required' && user === null) {
        throw new ApiError('unauthenticated', 'Session absente ou expirée');
      }
      uid = user?.uid ?? null;
      const body = await parseBody(request, options.body);
      if (options.rateLimit !== undefined && user !== null) {
        await enforceRateLimit(user.uid, options.name, options.rateLimit);
      }
      const params = await context.params;
      const response = await handler({
        request,
        requestId,
        user: user as UserFor<A>,
        body,
        params,
      });
      logger.info('api', {
        route: options.name,
        requestId,
        uid,
        status: response.status,
        ms: Date.now() - started,
      });
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        logger.warn('api-rejected', {
          route: options.name,
          requestId,
          uid,
          code: error.code,
          ms: Date.now() - started,
        });
        return jsonResponse(
          { error: error.code, message: error.message },
          { status: error.status },
        );
      }
      logger.error('api-failure', error, { route: options.name, requestId, uid });
      return jsonResponse({ error: 'internal', message: 'Erreur interne' }, { status: 500 });
    }
  };
}
