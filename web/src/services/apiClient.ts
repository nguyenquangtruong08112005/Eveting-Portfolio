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

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
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

    // Auto-refresh token on 401 Unauthorized if refreshToken exists
    if (
      res.status === 401 &&
      path !== '/api/web/auth/refresh' &&
      path !== '/api/web/auth/login' &&
      typeof window !== 'undefined'
    ) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE}/api/web/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            localStorage.setItem('token', refreshData.accessToken);
            if (refreshData.refreshToken) {
              localStorage.setItem('refreshToken', refreshData.refreshToken);
            }
            // Retry request with new token
            headers['Authorization'] = `Bearer ${refreshData.accessToken}`;
            res = await fetch(url, {
              method,
              headers,
              body: options.body ? JSON.stringify(options.body) : undefined,
            });
          } else {
            // Refresh token expired or invalid, sign out user
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('role');
            localStorage.removeItem('uid');
            window.location.href = '/login';
          }
        } catch {
          // Allow original 401 logic to proceed if network error occurs during refresh
        }
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

const cache = new Map<string, { data: any; expiry: number }>();

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
    return cached.data;
  }

  const data = await request<T>(method, path, options);
  cache.set(cacheKey, { data, expiry: Date.now() + ttlMs });
  return data;
}
