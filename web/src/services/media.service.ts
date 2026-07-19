import { request } from './apiClient';
import type { EventMedia } from '@/types';

export class MediaService {
  static async listEventMedia(
    eventId: string,
    page = 1,
    limit = 20
  ): Promise<{ media: EventMedia[]; total?: number }> {
    return request<{ media: EventMedia[]; total?: number }>(
      'GET',
      `/api/web/events/${eventId}/media?page=${page}&limit=${limit}`
    );
  }
}
