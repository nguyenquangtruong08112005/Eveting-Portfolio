import { API_BASE } from './apiClient';

export class StorageService {
  static async upload(file: File): Promise<{ url: string; key?: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const res = await fetch(`${API_BASE}/storage/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      let errorBody: unknown;
      try {
        errorBody = await res.json();
      } catch {
        errorBody = { message: res.statusText };
      }
      throw new Error(
        (errorBody as { message?: string })?.message || `Upload failed: ${res.status}`
      );
    }

    return res.json();
  }
}
