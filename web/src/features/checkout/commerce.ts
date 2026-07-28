import { HttpError, request } from '@/services/apiClient';
import { TicketService } from '@/services/ticket.service';
import { buildCheckoutPayload } from './commerce.contract';
import type { CheckoutAttendee, CheckoutDraft } from './commerce.contract';
export { buildCheckoutPayload, validateCheckoutQuestions } from './commerce.contract';
export type { CheckoutAttendee, CheckoutDraft, CheckoutItem } from './commerce.contract';

export interface CheckoutOrder {
  orderId?: string;
  ticketIds: string[];
  paymentUrl?: string;
  buyerMessage?: string;
}

const ORDER_CHECKOUT_PATH = '/api/web/orders/checkout';

function idempotencyHeader(): Record<string, string> {
  return { 'X-Idempotency-Key': crypto.randomUUID() };
}

function isUnavailable(error: unknown): boolean {
  return error instanceof HttpError && [404, 405, 501].includes(error.status);
}

function normalizeOrder(value: Record<string, unknown>): CheckoutOrder {
  const tickets = Array.isArray(value.tickets) ? value.tickets : [];
  const ticketIds = tickets
    .map((ticket) => (ticket && typeof ticket === 'object' ? (ticket as { id?: unknown }).id : ticket))
    .filter((id): id is string => typeof id === 'string');
  const payment = value.payment && typeof value.payment === 'object' ? value.payment as Record<string, unknown> : {};
  return {
    orderId: typeof value.orderId === 'string' ? value.orderId : typeof value.id === 'string' ? value.id : undefined,
    ticketIds,
    paymentUrl: typeof value.order_url === 'string' ? value.order_url : typeof payment.order_url === 'string' ? payment.order_url : undefined,
    buyerMessage: typeof value.buyerMessage === 'string' ? value.buyerMessage : undefined,
  };
}

/** Prefer the additive order endpoint. Legacy booking is intentionally limited to one ticket type. */
export async function createCheckoutOrder(draft: CheckoutDraft): Promise<CheckoutOrder> {
  try {
    const data = await request<Record<string, unknown>>('POST', ORDER_CHECKOUT_PATH, {
      body: buildCheckoutPayload(draft),
      headers: idempotencyHeader(),
    });
    return normalizeOrder(data);
  } catch (error) {
    if (!isUnavailable(error)) throw error;
  }

  if (draft.seatHold || draft.items.length !== 1) {
    throw new Error('This checkout requires the order checkout endpoint.');
  }
  const [item] = draft.items;
  const legacy = await TicketService.bookTickets(draft.eventId, [item], draft.promoCode);
  return { ticketIds: legacy.tickets.map((ticket) => ticket.id) };
}

export async function saveCheckoutAttendees(
  eventId: string,
  orderId: string,
  attendees: CheckoutAttendee[]
): Promise<void> {
  await request('PUT', `/api/web/orders/${encodeURIComponent(orderId)}/attendees`, {
    body: { eventId, attendees },
  });
}

export async function createOrderPayment(orderId: string, redirectUrl: string): Promise<{ order_url?: string }> {
  return request('POST', '/api/web/payments/create-order', {
    body: { orderId, redirectUrl },
    headers: idempotencyHeader(),
  });
}

export async function quoteCheckoutVoucher(
  code: string,
  eventId: string,
  subtotalVnd: number,
  ticketQuantity: number
): Promise<{ discountAmount: number; totalAmount: number; message?: string }> {
  const data = await request<Record<string, unknown>>('POST', '/api/web/vouchers/quote', {
    body: { code, eventId, subtotalVnd, ticketQuantity },
  });
  return {
    discountAmount: Number(data.discountAmount ?? data.discount ?? 0),
    totalAmount: Number(data.totalAmount ?? data.total ?? subtotalVnd),
    message: typeof data.message === 'string' ? data.message : undefined,
  };
}
