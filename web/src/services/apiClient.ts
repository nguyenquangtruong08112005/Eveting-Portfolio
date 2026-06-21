import type { RequestMethod, RequestOptions } from '@/types/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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

// Token refresh mutex — only one refresh in flight at a time
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

export async function request<T>(
  method: RequestMethod,
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Safely inject authorization token from localStorage in client-side context
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = `${API_BASE}${path}`;

  try {
    let res = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    // Auto-refresh token on 401 Unauthorized
    if (
      res.status === 401 &&
      path !== '/api/web/auth/refresh' &&
      path !== '/api/web/auth/login' &&
      typeof window !== 'undefined'
    ) {
      try {
        const newToken = await refreshAccessToken();
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(url, {
          method,
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
        });
      } catch {
        // refreshAccessToken already handles redirect on failure
      }
    }

    if (!res.ok) {
      let errorBody: unknown;
      try {
        errorBody = await res.json();
      } catch {
        errorBody = { message: res.statusText };
      }
      throw new HttpError(res.status, (errorBody as { message?: string })?.message || `API error: ${res.status}`, errorBody);
    }

    return res.json();
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    // Fallback for network failures or other fetch-related issues
    throw new Error(error instanceof Error ? error.message : 'Unknown network error occurred');
  }
}

const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_MAX_SIZE = 50;

export async function requestCached<T>(
  method: RequestMethod,
  path: string,
  options: RequestOptions = {},
  ttlMs = 30000
): Promise<T> {
  if (method !== 'GET') {
    cache.clear();
    return request<T>(method, path, options);
  }

  const cacheKey = `${path}_${JSON.stringify(options)}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data as T;
  }

  const data = await request<T>(method, path, options);

  // LRU eviction: remove oldest entry if at capacity
  if (cache.size >= CACHE_MAX_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }

  cache.set(cacheKey, { data, expiry: Date.now() + ttlMs });
  return data;
}
