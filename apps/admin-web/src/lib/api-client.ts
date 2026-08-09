import type { z } from 'zod';
import { env } from './env';

// Mirrors the backend's uniform error envelope exactly
// (apps/api/src/common/filters/http-exception.filter.ts:
// `{ error: { code, message, details } }`) — every AppException subclass's
// `code` (LEAD_NOT_FOUND, VALIDATION_ERROR, FORBIDDEN, ...) survives the
// round trip so a caller can branch on it, never just a flattened string.
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown;

  constructor(params: { code: string; message: string; status: number; details?: unknown }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code;
    this.status = params.status;
    this.details = params.details ?? {};
  }
}

interface RequestOptions<T> {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
  // Dev-only contract-drift check (frontend architecture review §9) — never
  // enforced in production, since a benign extra/renamed field must not
  // crash the UI.
  schema?: z.ZodType<T>;
}

interface ErrorEnvelope {
  error: { code: string; message: string; details?: unknown };
}

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as { error: unknown }).error === 'object' &&
    (value as { error: unknown }).error !== null
  );
}

async function request<T>(path: string, options: RequestOptions<T> = {}): Promise<T> {
  const { method = 'GET', body, token, signal, schema } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch {
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: 'Could not reach the server. Check your connection and try again.',
      status: 0,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload: unknown = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const envelope = isErrorEnvelope(payload) ? payload.error : null;
    throw new ApiError({
      code: envelope?.code ?? 'UNKNOWN_ERROR',
      message: envelope?.message ?? 'An unexpected error occurred',
      status: response.status,
      details: envelope?.details,
    });
  }

  if (process.env.NODE_ENV !== 'production' && schema) {
    const result = schema.safeParse(payload);
    if (!result.success) {
      console.warn(
        `[apiClient] Response for ${method} ${path} did not match its expected schema`,
        result.error.flatten(),
      );
    }
  }

  return payload as T;
}

type BodilessOptions<T> = Omit<RequestOptions<T>, 'method' | 'body'>;

// One function per verb, matching every backend controller's own vocabulary
// (GET/POST/PATCH/DELETE — no PUT exists anywhere in the API, per the v1.0
// endpoint inventory). Every feature module's `api/` folder calls these,
// never `fetch` directly.
export const apiClient = {
  get: <T>(path: string, options?: BodilessOptions<T>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: BodilessOptions<T>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: BodilessOptions<T>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: BodilessOptions<T>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
