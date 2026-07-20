import type { RequestMethod, RequestOptions } from '@/types/api';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export class HttpError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

// ─── Token refresh mutex ─────────────────────────────────────────────────────
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');

    const res = await fetch(`${API_BASE}/api/web/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('role');
      localStorage.removeItem('uid');
      window.location.href = '/login';
      throw new Error('Refresh failed');
    }

    const data = await res.json();
    localStorage.setItem('token', data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    return data.accessToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

// ─── GET cache + in-flight dedupe (cuts rate-limit pressure) ─────────────────
const DEFAULT_GET_TTL_MS = 2 * 60 * 1000; // 2 minutes
const CACHE_MAX_SIZE = 80;

type CacheEntry = { data: unknown; expiry: number };
const responseCache = new Map<string, CacheEntry>();
/** Same URL+options in flight → share one Promise */
const inflight = new Map<string, Promise<unknown>>();

function cacheKey(method: string, path: string, options: RequestOptions): string {
  return `${method}:${path}:${JSON.stringify(options.body ?? null)}:${options.headers?.Authorization ?? ''}`;
}

export function invalidateApiCache(pathPrefix?: string): void {
  if (!pathPrefix) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.includes(pathPrefix)) responseCache.delete(key);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 2
): Promise<Response> {
  let lastRes: Response | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, init);
    lastRes = res;
    if (res.status !== 429) return res;

    // Honor Retry-After when present; else exponential backoff
    const retryAfter = res.headers.get('Retry-After');
    const waitMs = retryAfter
      ? Math.min(Number(retryAfter) * 1000 || 2000, 15000)
      : Math.min(1000 * 2 ** attempt, 8000);
    if (attempt < retries) await sleep(waitMs);
  }
  return lastRes!;
}

export async function request<T>(
  method: RequestMethod,
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${path}`;
  const key = cacheKey(method, path, { ...options, headers });

  // GET: serve from memory cache
  if (method === 'GET') {
    const hit = responseCache.get(key);
    if (hit && hit.expiry > Date.now()) {
      return hit.data as T;
    }
    const pending = inflight.get(key);
    if (pending) return pending as Promise<T>;
  }

  const run = (async (): Promise<T> => {
    try {
      let res = await fetchWithRetry(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (
        res.status === 401 &&
        path !== '/api/web/auth/refresh' &&
        path !== '/api/web/auth/login' &&
        typeof window !== 'undefined'
      ) {
        try {
          const newToken = await refreshAccessToken();
          headers['Authorization'] = `Bearer ${newToken}`;
          res = await fetchWithRetry(url, {
            method,
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
          });
        } catch {
          /* redirect handled in refresh */
        }
      }

      if (!res.ok) {
        let errorBody: unknown;
        try {
          errorBody = await res.json();
        } catch {
          errorBody = { message: res.statusText };
        }
        const msg =
          (errorBody as { message?: string; error?: string })?.message ||
          (errorBody as { error?: string })?.error ||
          `API error: ${res.status}`;
        throw new HttpError(res.status, msg, errorBody);
      }

      const data = (await res.json()) as T;

      if (method === 'GET') {
        if (responseCache.size >= CACHE_MAX_SIZE) {
          const oldest = responseCache.keys().next().value;
          if (oldest) responseCache.delete(oldest);
        }
        responseCache.set(key, {
          data,
          expiry: Date.now() + DEFAULT_GET_TTL_MS,
        });
      } else {
        // Mutations: drop related GET caches
        invalidateApiCache(path.split('?')[0]);
      }

      return data;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new Error(
        error instanceof Error ? error.message : 'Unknown network error occurred'
      );
    } finally {
      if (method === 'GET') inflight.delete(key);
    }
  })();

  if (method === 'GET') inflight.set(key, run);
  return run;
}

/**
 * Explicit cached GET with custom TTL (still shares the same cache map).
 */
export async function requestCached<T>(
  method: RequestMethod,
  path: string,
  options: RequestOptions = {},
  ttlMs = DEFAULT_GET_TTL_MS
): Promise<T> {
  if (method !== 'GET') {
    return request<T>(method, path, options);
  }

  const headers: Record<string, string> = { ...options.headers };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const key = cacheKey(method, path, { ...options, headers });
  const hit = responseCache.get(key);
  if (hit && hit.expiry > Date.now()) {
    return hit.data as T;
  }

  const data = await request<T>(method, path, options);
  responseCache.set(key, { data, expiry: Date.now() + ttlMs });
  return data;
}
