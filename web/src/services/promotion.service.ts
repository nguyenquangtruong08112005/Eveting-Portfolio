import { request, requestCached } from './apiClient';
import type { Promotion, PromotionCreateBody, PromotionUpdateBody } from '@/types';

export type { Promotion };

export class PromotionService {
  /** Public active promotions for home banners / discovery. */
  static async listPublic(): Promise<Promotion[]> {
    const data = await requestCached<Promotion[] | { promotions: Promotion[] }>(
      'GET',
      '/promotions',
      {},
      3 * 60 * 1000
    );
    if (Array.isArray(data)) return data;
    return data?.promotions || [];
  }

  static async listMine(): Promise<Promotion[]> {
    const data = await request<Promotion[] | { promotions: Promotion[] }>(
      'GET',
      '/promotions/organizer'
    );
    if (Array.isArray(data)) return data;
    return data?.promotions || [];
  }

  static async create(body: PromotionCreateBody): Promise<Promotion> {
    return request<Promotion>('POST', '/promotions/organizer', { body });
  }

  static async update(id: string, body: PromotionUpdateBody): Promise<Promotion> {
    return request<Promotion>('PUT', `/promotions/organizer/${id}`, { body });
  }

  static async remove(id: string): Promise<void> {
    await request('DELETE', `/promotions/organizer/${id}`);
  }
}
