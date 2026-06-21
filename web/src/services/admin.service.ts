import { request } from './apiClient';
import { Event } from '@/types';

export class AdminService {
  static async getPendingEvents(): Promise<{ events: Event[] }> {
    return request<{ events: Event[] }>('GET', '/api/admin/events/pending');
  }

  static async approveEvent(eventId: string): Promise<{ message: string }> {
    return request<{ message: string }>('POST', `/api/admin/events/${eventId}/approve`);
  }

  static async rejectEvent(eventId: string, reason: string): Promise<{ message: string }> {
    return request<{ message: string }>('POST', `/api/admin/events/${eventId}/reject`, {
      body: { reason },
    });
  }
}
