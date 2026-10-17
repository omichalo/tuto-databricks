import 'server-only';

export type ApiErrorCode =
  | 'bad-request'
  | 'unauthenticated'
  | 'reauthentication-required'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'rate-limited'
  | 'app-check-failed'
  | 'origin-rejected'
  | 'internal';

const STATUS: Record<ApiErrorCode, number> = {
  'bad-request': 400,
  unauthenticated: 401,
  'reauthentication-required': 401,
  forbidden: 403,
  'app-check-failed': 403,
  'origin-rejected': 403,
  'not-found': 404,
  conflict: 409,
  'rate-limited': 429,
  internal: 500,
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.code = code;
    this.status = STATUS[code];
  }
}
