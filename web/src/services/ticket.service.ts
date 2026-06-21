import { request } from './apiClient';
import { Ticket, BackendSeat } from '@/types';

export interface VoucherResult {
  valid: boolean;
  discountType?: string;
  discountValue?: number;
  discountAmount?: number;
  maxDiscount?: number;
  message: string;
}

export class TicketService {
  static async getEventSeats(eventId: string): Promise<BackendSeat[]> {
    return request<BackendSeat[]>('GET', `/api/web/tickets/event/${eventId}/seats`);
  }

  static async holdSeat(eventId: string, seatId: string): Promise<{ message: string }> {
    return request<{ message: string }>('POST', '/api/web/tickets/hold-seat', {
      body: { eventId, seatId },
    });
  }

  static async releaseSeat(eventId: string, seatId: string): Promise<{ message: string }> {
    return request<{ message: string }>('POST', '/api/web/tickets/release-seat', {
      body: { eventId, seatId },
    });
  }

  static async bookHeldSeats(
    eventId: string,
    seatIds: string[],
    promoCode?: string
  ): Promise<{ message: string; orderId?: string; tickets?: { id: string }[] }> {
    return request<{ message: string; orderId?: string; tickets?: { id: string }[] }>(
      'POST',
      '/api/web/tickets/book-held-seats',
      { body: { eventId, seatIds, promoCode } }
    );
  }

  static async bookTickets(
    eventId: string,
    items: { ticketType: string; quantity: number }[],
    promoCode?: string
  ): Promise<{ tickets: { id: string }[] }> {
    const tickets: { id: string }[] = [];
    for (const item of items) {
      const res = await request<{ id: string }>('POST', '/api/web/tickets/book', {
        body: { eventId, ticketType: item.ticketType, quantity: item.quantity, promoCode },
      });
      if (res && res.id) {
        tickets.push({ id: res.id });
      }
    }
    return { tickets };
  }

  static async createPaymentOrder(
    ticketId: string,
    redirectUrl?: string
  ): Promise<{ order_url: string; app_trans_id: string }> {
    return request<{ order_url: string; app_trans_id: string }>(
      'POST',
      '/api/web/payments/create-order',
      { body: { ticketId, redirectUrl } }
    );
  }

  static async validateVoucher(code: string, orderTotal: number, eventId?: string): Promise<VoucherResult> {
    return request<VoucherResult>('POST', '/api/web/vouchers/validate', {
      body: { code, orderTotal, eventId },
    });
  }

  static async getUserTickets(): Promise<{ tickets: Ticket[] }> {
    return request<{ tickets: Ticket[] }>('GET', '/api/web/tickets');
  }
}
