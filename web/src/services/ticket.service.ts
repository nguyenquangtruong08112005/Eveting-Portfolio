import { request } from "./apiClient";
import type { Ticket, BackendSeat, VoucherResult } from "@/types";

export type { VoucherResult };

function ik(): Record<string, string> {
  return { 'X-Idempotency-Key': crypto.randomUUID() };
}

export class TicketService {
  static async getEventSeats(eventId: string): Promise<BackendSeat[]> {
    return request<BackendSeat[]>(
      "GET",
      `/api/web/tickets/event/${eventId}/seats`,
    );
  }

  static async holdSeat(
    eventId: string,
    seatId: string,
  ): Promise<{ message: string }> {
    return request<{ message: string }>("POST", "/api/web/tickets/hold-seat", {
      body: { eventId, seatId },
      headers: ik(),
    });
  }

  static async releaseSeat(
    eventId: string,
    seatId: string,
  ): Promise<{ message: string }> {
    return request<{ message: string }>(
      "POST",
      "/api/web/tickets/release-seat",
      {
        body: { eventId, seatId },
      },
    );
  }

  static async bookHeldSeats(
    eventId: string,
    seatIds: string[],
    promoCode?: string,
  ): Promise<{
    message: string;
    orderId?: string;
    tickets?: { id: string }[];
  }> {
    return request<{
      message: string;
      orderId?: string;
      tickets?: { id: string }[];
    }>("POST", "/api/web/tickets/book-held-seats", {
      body: { eventId, seatIds, promoCode },
      headers: ik(),
    });
  }

  static async bookTickets(
    eventId: string,
    items: { ticketType: string; quantity: number }[],
    promoCode?: string,
  ): Promise<{ tickets: { id: string }[] }> {
    const tickets: { id: string }[] = [];
    for (const item of items) {
      const res = await request<{ id: string }>(
        "POST",
        "/api/web/tickets/book",
        {
          body: {
            eventId,
            ticketType: item.ticketType,
            quantity: item.quantity,
            promoCode,
          },
          headers: ik(),
        },
      );
      if (res && res.id) {
        tickets.push({ id: res.id });
      }
    }
    return { tickets };
  }

  static async bookOrderAtomic(
    eventId: string,
    items: { ticketType: string; quantity: number }[],
    promoCode?: string,
  ): Promise<{ orderId: string; tickets: { id: string }[] }> {
    return request<{ orderId: string; tickets: { id: string }[] }>(
      "POST",
      "/api/web/tickets/book-order",
      { body: { eventId, items, promoCode }, headers: ik() },
    );
  }

  static async createPaymentOrder(
    ticketId: string,
    redirectUrl?: string,
  ): Promise<{ order_url: string; app_trans_id: string }> {
    return request<{ order_url: string; app_trans_id: string }>(
      "POST",
      "/api/web/payments/create-order",
      { body: { ticketId, redirectUrl }, headers: ik() },
    );
  }

  static async createBulkPaymentOrder(
    orderId: string,
    redirectUrl?: string,
  ): Promise<{ order_url: string; app_trans_id: string; orderId: string }> {
    return request<{ order_url: string; app_trans_id: string; orderId: string }>(
      "POST",
      "/api/web/payments/create-order-bulk",
      { body: { orderId, redirectUrl }, headers: ik() },
    );
  }

  static async checkOrderPaymentStatus(
    orderId: string,
  ): Promise<{ status: string; orderId: string; totalAmount?: number }> {
    return request<{ status: string; orderId: string; totalAmount?: number }>(
      "POST",
      "/api/web/payments/check-order-status",
      { body: { orderId }, headers: ik() },
    );
  }

  static async validateVoucher(
    code: string,
    orderTotal: number,
    eventId?: string,
  ): Promise<VoucherResult> {
    return request<VoucherResult>("POST", "/api/web/vouchers/validate", {
      body: { code, orderTotal, eventId },
    });
  }

  static async getUserTickets(
    page = 1,
    limit = 10
  ): Promise<{
    tickets: Ticket[];
    pagination?: { currentPage: number; limit: number; totalPages: number; totalItems: number };
  }> {
    return request(
      "GET",
      `/api/web/tickets?page=${page}&limit=${limit}`
    );
  }

  static async getTicketDetails(ticketId: string): Promise<any> {
    return request<any>("GET", `/api/web/tickets/${ticketId}`);
  }

  static async checkPaymentStatus(
    ticketId: string,
  ): Promise<{ status: string; message?: string }> {
    return request<{ status: string; message?: string }>(
      "POST",
      "/api/web/payments/check-status",
      { body: { ticketId }, headers: ik() },
    );
  }
}
