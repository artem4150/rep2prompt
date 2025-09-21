import type { ApiError, ApiErrorCode } from './types';

type HttpOptions = RequestInit & { signal?: AbortSignal };

type ErrorPayload = {
  error?: { code?: ApiErrorCode; message?: string; details?: unknown };
  code?: ApiErrorCode;
  message?: string;
  details?: unknown;
};

const BASE = (process.env.NEXT_PUBLIC_API_BASE ?? '').replace(/\/$/, '');

function normalizeError(payload: ErrorPayload | undefined): ApiError {
  const code = payload?.error?.code ?? payload?.code ?? 'generic';
  const message = payload?.error?.message ?? payload?.message ?? 'Что-то пошло не так';
  const details = payload?.error?.details ?? payload?.details;
  return { code, message, details };
}

export async function http<T>(path: string, init: HttpOptions = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: init.credentials ?? 'include',
    signal: init.signal,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload: unknown = isJson ? await response.json().catch(() => undefined) : undefined;

  if (!response.ok) {
    throw normalizeError(payload);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  if (!payload) {
    throw normalizeError({ code: 'generic', message: 'Empty response' });
  }

  return payload as T;
}
