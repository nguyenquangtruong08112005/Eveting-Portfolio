import { request, requestCached } from './apiClient';
import type { Promotion } from '@/types';

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
}
