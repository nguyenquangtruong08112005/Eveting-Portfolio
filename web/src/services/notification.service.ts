import { request, requestCached } from './apiClient';
import type { AppNotification } from '@/types';

export class NotificationService {
  static async list(): Promise<{ notifications: AppNotification[] }> {
    const data = await requestCached<
      AppNotification[] | { notifications: AppNotification[] }
    >('GET', '/notifications', {}, 2 * 60 * 1000);
    if (Array.isArray(data)) return { notifications: data };
    return { notifications: data?.notifications || [] };
  }

  static async markRead(notificationId: string): Promise<{ message: string }> {
    return request<{ message: string }>(
      'POST',
      `/notifications/${notificationId}/read`
    );
  }
}
