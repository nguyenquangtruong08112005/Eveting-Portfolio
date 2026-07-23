import { API_BASE } from './apiClient';

export type UploadPurpose = 'profile' | 'event' | 'media' | 'misc';

export interface UploadResult {
  url: string;
  key?: string;
  contentType?: string;
  originalName?: string;
  size?: number;
}

/**
 * Multipart upload to server → R2/S3 (or local) via POST /storage/upload.
 * Matches mobile attendee: field `file` + optional `purpose` (profile | event | media | misc).
 */
export class StorageService {
  static async upload(
    file: File,
    purpose: UploadPurpose = 'misc'
  ): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', purpose);

    const headers: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/storage/upload`, {
      method: 'POST',
      headers,
      body: formData,
      // do not set Content-Type — browser sets multipart boundary
    });

    if (!res.ok) {
      let errorBody: unknown;
      try {
        errorBody = await res.json();
      } catch {
        errorBody = { message: res.statusText };
      }
      throw new Error(
        (errorBody as { error?: string; message?: string })?.error ||
          (errorBody as { message?: string })?.message ||
          `Upload failed: ${res.status}`
      );
    }

    return res.json();
  }
}
