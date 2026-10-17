import { appCheckToken } from './firebase';

export class ApiCallError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface ErrorPayload {
  readonly error?: unknown;
  readonly message?: unknown;
}

async function call(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<Response> {
  const headers = new Headers({ accept: 'application/json' });
  if (body !== undefined) headers.set('content-type', 'application/json');
  const token = await appCheckToken();
  if (token !== null) headers.set('x-firebase-appcheck', token);
  const init: RequestInit = { method, headers, credentials: 'same-origin', cache: 'no-store' };
  if (body !== undefined) init.body = JSON.stringify(body);
  const response = await fetch(path, init);
  if (!response.ok) {
    let payload: ErrorPayload = {};
    try {
      payload = (await response.json()) as ErrorPayload;
    } catch {
      // corps non JSON : on garde le statut seul
    }
    throw new ApiCallError(
      response.status,
      typeof payload.error === 'string' ? payload.error : 'unknown',
      typeof payload.message === 'string' ? payload.message : `Erreur ${String(response.status)}`,
    );
  }
  return response;
}

export async function apiJson<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await call(method, path, body);
  return (await response.json()) as T;
}

export async function apiBlob(path: string, body: unknown): Promise<Blob> {
  const response = await call('POST', path, body);
  return response.blob();
}
