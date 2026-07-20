import { request } from './apiClient';
import type { LedgerEntry, OrganizerStats, OrganizerEvent } from '@/types';

type RawStats = Partial<OrganizerStats> & {
  totalRevenue?: number;
  totalTicketsSold?: number;
  totalEvents?: number;
  upcomingEvents?: number;
  platformFee?: number;
  fees?: number;
};

function normalizeStats(raw: RawStats | null | undefined): OrganizerStats {
  const gross =
    Number(raw?.grossRevenue ?? raw?.totalRevenue ?? 0) || 0;
  const fees =
    Number(raw?.platformFees ?? raw?.platformFee ?? raw?.fees ?? 0) || 0;
  const totalSales =
    Number(raw?.totalSales ?? raw?.totalTicketsSold ?? 0) || 0;
  const net =
    Number(raw?.netRevenue ?? gross - fees) || 0;
  return {
    totalSales,
    grossRevenue: gross,
    platformFees: fees,
    netRevenue: net,
  };
}

export class OrganizerService {
  static async getLedger(): Promise<{ entries: LedgerEntry[] }> {
    return request<{ entries: LedgerEntry[] }>('GET', '/api/organizer/ledger');
  }

  static async getStats(): Promise<OrganizerStats> {
    const raw = await request<RawStats>('GET', '/api/organizer/me/stats');
    return normalizeStats(raw);
  }

  static async getEvents(): Promise<{ data: OrganizerEvent[] }> {
    return request<{ data: OrganizerEvent[] }>(
      'GET',
      '/api/organizer/me/events'
    );
  }

  static async getEventStats(eventId: string): Promise<Record<string, unknown>> {
    return request<Record<string, unknown>>(
      'GET',
      `/api/organizer/events/${eventId}/stats`
    );
  }

  static async getAttendees(
    eventId: string
  ): Promise<{
    attendees: Array<{
      ticket: {
        id: string;
        type?: string;
        seat?: string;
        status?: string;
        purchaseDate?: number | string;
      };
      user: {
        id: string;
        name?: string;
        email?: string;
        profilePicUrl?: string;
      };
    }>;
  }> {
    return request('GET', `/api/organizer/events/${eventId}/attendees`);
  }

  static async checkInByQr(qrToken: string): Promise<{
    valid: boolean;
    message?: string;
    error?: string;
    ticketInfo?: {
      ticketId: string;
      userId?: string;
      ticketType?: string;
      seat?: string;
      status?: string;
      checkedInAt?: number;
    };
  }> {
    return request('POST', '/api/organizer/check-in-qr', {
      body: { qrToken },
    });
  }
}
