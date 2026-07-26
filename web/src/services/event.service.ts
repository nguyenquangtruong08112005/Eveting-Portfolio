import { request, requestCached } from './apiClient';
import type { Event, Destination, EventWeather } from '@/types';

export type { Destination };

const LIST_TTL = 3 * 60 * 1000;
const SEARCH_TTL = 90 * 1000;
const DETAIL_TTL = 2 * 60 * 1000;

export class EventService {
  static async list(limit = 50): Promise<{ events: Event[] }> {
    return requestCached<{ events: Event[] }>(
      'GET',
      `/api/web/events?limit=${limit}`,
      {},
      LIST_TTL
    );
  }

  static async getDestinations(limit = 10): Promise<{ destinations: Destination[] }> {
    return requestCached<{ destinations: Destination[] }>(
      'GET',
      `/api/web/events/destinations?limit=${limit}`,
      {},
      LIST_TTL
    );
  }

  static async getById(id: string): Promise<Event> {
    return requestCached<Event>('GET', `/api/web/events/${id}`, {}, DETAIL_TTL);
  }

  static async create(eventData: unknown): Promise<Event> {
    return request<Event>('POST', '/api/web/events', { body: eventData });
  }

  static async update(eventId: string, eventData: unknown): Promise<Event> {
    return request<Event>('PUT', `/api/web/events/${eventId}`, { body: eventData });
  }

  static async submitDraft(eventId: string): Promise<unknown> {
    return request('POST', `/api/web/events/${eventId}/submit-draft`);
  }

  static async cancel(eventId: string): Promise<unknown> {
    return request('DELETE', `/api/web/events/${eventId}`);
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
  }): Promise<{ events: Event[]; total?: number; page?: number; hasMore?: boolean }> {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        qs.set(key, String(value));
      }
    }
    const queryStr = qs.toString();
    const data = await requestCached<{
      events: Event[];
      total?: number;
      page?: number;
      pagination?: {
        currentPage?: number;
        totalItems?: number;
      };
    }>('GET', `/api/web/events/search${queryStr ? `?${queryStr}` : ''}`, {}, SEARCH_TTL);

    const page = data.pagination?.currentPage ?? params.page ?? 1;
    const limit = params.limit ?? 12;
    const events = data.events || [];
    const total = data.total ?? data.pagination?.totalItems;
    const hasMore =
      total != null ? page * limit < total : events.length >= limit;

    return { ...data, events, hasMore };
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
      if (value !== undefined && value !== null) qs.set(key, String(value));
    }
    return requestCached<{ events: Event[] }>(
      'GET',
      `/api/web/events/nearby?${qs.toString()}`,
      {},
      LIST_TTL
    );
  }

  static async recommendations(limit = 10): Promise<{ events: Event[] }> {
    const data = await requestCached<Event[] | { events: Event[] }>(
      'GET',
      `/api/web/events/recommendations?limit=${limit}`,
      { allowAnonymous: true },
      LIST_TTL
    );
    return { events: Array.isArray(data) ? data : data.events || [] };
  }

  static async getWeather(eventId: string): Promise<EventWeather> {
    return requestCached<EventWeather>(
      'GET',
      `/api/web/events/${eventId}/weather`,
      {},
      10 * 60 * 1000
    );
  }
}
