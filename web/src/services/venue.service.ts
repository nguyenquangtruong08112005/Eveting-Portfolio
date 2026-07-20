import { request } from './apiClient';
import type { Venue } from '@/types';

export class VenueService {
  static async list(): Promise<Venue[]> {
    const data = await request<Venue[] | { venues: Venue[] }>('GET', '/venues');
    if (Array.isArray(data)) return data;
    return data?.venues || [];
  }

  static async create(body: {
    name: string;
    address?: string;
    city?: string;
    district?: string;
    country?: string;
    lat?: number;
    lng?: number;
    capacity?: number;
  }): Promise<Venue> {
    return request<Venue>('POST', '/venues', { body });
  }
}
