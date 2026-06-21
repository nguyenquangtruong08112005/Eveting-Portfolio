import { request } from './apiClient';
import { LedgerEntry, OrganizerStats, OrganizerEvent } from '@/types';

export class OrganizerService {
  static async getLedger(): Promise<{ entries: LedgerEntry[] }> {
    return request<{ entries: LedgerEntry[] }>('GET', '/api/organizer/ledger');
  }

  static async getStats(): Promise<OrganizerStats> {
    return request<OrganizerStats>('GET', '/api/organizer/me/stats');
  }

  static async getEvents(): Promise<{ data: OrganizerEvent[] }> {
    return request<{ data: OrganizerEvent[] }>('GET', '/api/organizer/me/events');
  }
}
