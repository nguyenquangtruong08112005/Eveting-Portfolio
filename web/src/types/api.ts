export interface ApiError {
  message: string;
  statusCode?: number;
}

export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
}
