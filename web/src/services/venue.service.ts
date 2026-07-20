import { request } from './apiClient';
import type { Venue } from '@/types';

export interface VenueWriteBody {
  name: string;
  address?: string;
  city?: string;
  district?: string;
  country?: string;
  lat?: number | null;
  lng?: number | null;
  capacity?: number | null;
  location?: { latitude?: number; longitude?: number; lat?: number; lng?: number };
}

export class VenueService {
  static async list(): Promise<Venue[]> {
    const data = await request<Venue[] | { venues: Venue[] }>('GET', '/venues');
    if (Array.isArray(data)) return data;
    return data?.venues || [];
  }

  static async getById(id: string): Promise<Venue> {
    return request<Venue>('GET', `/venues/${id}`);
  }

  static async create(body: VenueWriteBody): Promise<Venue> {
    return request<Venue>('POST', '/venues', { body });
  }

  static async update(id: string, body: Partial<VenueWriteBody>): Promise<Venue> {
    return request<Venue>('PUT', `/venues/${id}`, { body });
  }

  static async remove(id: string): Promise<void> {
    await request('DELETE', `/venues/${id}`);
  }
}
