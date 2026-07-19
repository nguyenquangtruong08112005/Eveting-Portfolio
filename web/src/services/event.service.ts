import { request, requestCached } from './apiClient';
import type { Event, Destination, EventWeather } from '@/types';

export type { Destination };

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

  static async search(params: {
    q?: string;
    category?: string;
    city?: string;
    dateFrom?: string;
    dateTo?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
  }): Promise<{ events: Event[]; total?: number; page?: number }> {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        qs.set(key, String(value));
      }
    }
    const queryStr = qs.toString();
    return request<{ events: Event[]; total?: number; page?: number }>(
      'GET',
      `/api/web/events/search${queryStr ? `?${queryStr}` : ''}`
    );
  }

  static async nearby(params: {
    lat: number;
    lon: number;
    radius?: number;
    page?: number;
    limit?: number;
  }): Promise<{ events: Event[] }> {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        qs.set(key, String(value));
      }
    }
    return request<{ events: Event[] }>(
      'GET',
      `/api/web/events/nearby?${qs.toString()}`
    );
  }

  static async recommendations(
    limit = 10
  ): Promise<{ events: Event[] }> {
    return request<{ events: Event[] }>(
      'GET',
      `/api/web/events/recommendations?limit=${limit}`
    );
  }

  static async getWeather(eventId: string): Promise<EventWeather> {
    return request<EventWeather>('GET', `/api/web/events/${eventId}/weather`);
  }
}
