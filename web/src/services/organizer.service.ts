import { request } from './apiClient';
import type {
  LedgerEntry,
  OrganizerStats,
  OrganizerEvent,
  EventAnalytics,
  OrganizerAttendeeRow,
  PayoutSummary,
  PaginatedPayouts,
  BankAccountInfo,
  BankAccountUpdateBody,
} from '@/types';

function normalizeBankInfo(raw: unknown): BankAccountInfo {
  if (!raw || typeof raw !== 'object') return { registered: false };
  const r = raw as Record<string, unknown>;

  // GET response: { registered: true, maskedDisplay, createdAt, updatedAt }
  if (r.registered === true) {
    return {
      registered: true,
      maskedDisplay: String(r.maskedDisplay ?? ''),
      createdAt: r.createdAt ? String(r.createdAt) : undefined,
      updatedAt: r.updatedAt ? String(r.updatedAt) : undefined,
    };
  }

  // GET response: { registered: false }
  if (r.registered === false) {
    return { registered: false };
  }

  // PUT response: { organizerId, maskedDisplay }
  if (typeof r.organizerId === 'string') {
    return {
      registered: true,
      maskedDisplay: String(r.maskedDisplay ?? ''),
      createdAt: undefined,
      updatedAt: undefined,
    };
  }

  return { registered: false };
}

type RawStats = Partial<OrganizerStats> & {
  totalRevenue?: number;
  totalTicketsSold?: number;
  totalEvents?: number;
  upcomingEvents?: number;
  platformFee?: number;
  fees?: number;
};

function normalizeStats(raw: RawStats | null | undefined): OrganizerStats {
  const gross = Number(raw?.grossRevenue ?? raw?.totalRevenue ?? 0) || 0;
  const fees = Number(raw?.platformFees ?? raw?.platformFee ?? raw?.fees ?? 0) || 0;
  const totalSales = Number(raw?.totalSales ?? raw?.totalTicketsSold ?? 0) || 0;
  const net = Number(raw?.netRevenue ?? gross - fees) || 0;
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
    return request<{ data: OrganizerEvent[] }>('GET', '/api/organizer/me/events');
  }

  static async getEventStats(eventId: string): Promise<EventAnalytics> {
    return request<EventAnalytics>('GET', `/api/organizer/events/${eventId}/stats`);
  }

  static async getAttendees(
    eventId: string
  ): Promise<{ attendees: OrganizerAttendeeRow[] }> {
    return request<{ attendees: OrganizerAttendeeRow[] }>(
      'GET',
      `/api/organizer/events/${eventId}/attendees`
    );
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

  static async broadcast(
    eventId: string,
    title: string,
    message: string
  ): Promise<{ success?: boolean; sentTo?: number }> {
    return request('POST', `/api/organizer/events/${eventId}/broadcast`, {
      body: { title, message },
    });
  }

  // ── Phase 05: Finance / Payouts ──────────────────────────────────────

  static async getPayoutSummary(): Promise<PayoutSummary> {
    return request<PayoutSummary>('GET', '/api/organizer/me/payout-summary');
  }

  static async getPayouts(
    page = 1,
    limit = 10
  ): Promise<PaginatedPayouts> {
    return request<PaginatedPayouts>(
      'GET',
      `/api/organizer/me/payouts?page=${page}&limit=${limit}`
    );
  }

  static async getBankAccount(): Promise<BankAccountInfo> {
    const raw = await request<unknown>('GET', '/api/organizer/me/payout-bank-account');
    return normalizeBankInfo(raw);
  }

  static async updateBankAccount(
    body: BankAccountUpdateBody
  ): Promise<BankAccountInfo> {
    const raw = await request<unknown>('PUT', '/api/organizer/me/payout-bank-account', {
      body,
    });
    return normalizeBankInfo(raw);
  }
}
