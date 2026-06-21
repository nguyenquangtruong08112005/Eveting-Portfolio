import { request, requestCached } from './apiClient';
import { Event } from '@/types';

export interface Destination {
  name: string;
  query: string;
  eventCount: number;
}

export class EventService {
  static async list(): Promise<{ events: Event[] }> {
    return requestCached<{ events: Event[] }>('GET', '/api/web/events?limit=50');
  }

  static async getDestinations(limit = 10): Promise<{ destinations: Destination[] }> {
    return requestCached<{ destinations: Destination[] }>('GET', `/api/web/events/destinations?limit=${limit}`);
  }

  static async getById(id: string): Promise<Event> {
    return request<Event>('GET', `/api/web/events/${id}`);
  }

  static async create(eventData: unknown): Promise<Event> {
    return request<Event>('POST', '/api/web/events', { body: eventData });
  }

  static async update(eventId: string, eventData: unknown): Promise<Event> {
    return request<Event>('PUT', `/api/web/events/${eventId}`, { body: eventData });
  }

  static async submitDraft(eventId: string): Promise<any> {
    return request<any>('POST', `/api/web/events/${eventId}/submit-draft`);
  }

  static async cancel(eventId: string): Promise<any> {
    return request<any>('DELETE', `/api/web/events/${eventId}`);
  }
}
