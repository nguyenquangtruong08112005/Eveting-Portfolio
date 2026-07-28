import { HttpError, request } from './apiClient';
import type {
  HoldSeatsRequest,
  OrganizerSeatLayoutResponse,
  ReleaseSeatHoldRequest,
  Seat,
  SeatAvailabilityResponse,
  SeatAvailabilityStatus,
  SeatHold,
  SeatLayout,
} from '@/types/seat';

type QueryValue = string | number | undefined;

export interface SeatApiEndpointAdapter {
  availability(eventId: string, query: { performanceId?: string; fresh: number }): string;
  hold(eventId: string): string;
  organizerLayout(eventId: string, query: { performanceId: string }): string;
}

function queryPath(path: string, values: Record<string, QueryValue>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export const defaultSeatApiEndpoints: SeatApiEndpointAdapter = {
  availability: (eventId, query) =>
    queryPath(`/api/web/tickets/events/${encodeURIComponent(eventId)}/seats`, query),
  hold: (eventId) => `/api/web/tickets/events/${encodeURIComponent(eventId)}/seats/hold`,
  organizerLayout: (eventId, query) =>
    queryPath(`/api/organizer/events/${encodeURIComponent(eventId)}/seat-layout`, query),
};

function idempotencyHeader(key?: string): Record<string, string> {
  return { 'X-Idempotency-Key': key || crypto.randomUUID() };
}

function normalizeDateTime(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const parsed = typeof value === 'number' ? value : /^\d+$/.test(value) ? Number(value) : value;
  const date = new Date(parsed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function canonicalStatus(status: unknown): SeatAvailabilityStatus {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'AVAILABLE' || normalized === 'HELD' || normalized === 'SOLD') {
    return normalized;
  }
  return 'BLOCKED';
}

function normalizeSeat(raw: Record<string, unknown>): Seat {
  const rowLabel = String(raw.rowLabel ?? raw.rowName ?? '');
  const column = Number(raw.column ?? raw.seatNumber ?? 0);
  return {
    id: String(raw.seatId ?? raw.id),
    label: String(raw.label ?? raw.code ?? `${rowLabel}${column}`),
    rowLabel,
    column,
    sectionId: String(raw.sectionId ?? raw.seatSectionId ?? ''),
    sectionName: String(raw.sectionName ?? ''),
    status: canonicalStatus(raw.status),
    heldByCurrentUser: Boolean(raw.heldByCurrentUser),
    holdExpiresAt: normalizeDateTime(raw.holdExpiresAt ?? raw.expiresAt),
    price: raw.price == null ? null : Number(raw.price),
  };
}

function responseRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function normalizeAvailability(
  eventId: string,
  performanceId: string,
  value: unknown
): SeatAvailabilityResponse {
  const body = responseRecord(value);
  const source = Array.isArray(value) ? value : Array.isArray(body.seats) ? body.seats : [];
  const currentHoldSource = responseRecord(body.currentHold ?? body.hold);
  const holdToken = currentHoldSource.holdToken ?? currentHoldSource.holdId ?? currentHoldSource.id;
  const expiresAt = normalizeDateTime(
    currentHoldSource.expiresAt ?? currentHoldSource.holdExpiresAt
  );
  const currentHold =
    typeof holdToken === 'string' &&
    expiresAt !== null &&
    Array.isArray(currentHoldSource.seatIds)
      ? {
          holdToken,
          eventId,
          performanceId: String(currentHoldSource.performanceId ?? performanceId),
          seatIds: currentHoldSource.seatIds.map(String),
          expiresAt,
        }
      : undefined;
  return {
    eventId: String(body.eventId ?? eventId),
    performanceId: String(body.performanceId ?? performanceId),
    seats: source.map((seat) => normalizeSeat(responseRecord(seat))),
    currentHold,
    fetchedAt: typeof body.fetchedAt === 'string' ? body.fetchedAt : undefined,
  };
}

function normalizeHold(
  eventId: string,
  requestBody: HoldSeatsRequest,
  value: unknown
): SeatHold {
  const body = responseRecord(value);
  const hold = responseRecord(body.hold);
  const source = Object.keys(hold).length > 0 ? hold : body;
  const expiresAt = normalizeDateTime(source.expiresAt ?? source.holdExpiresAt);
  const holdToken = source.holdToken ?? source.holdId ?? source.id;
  const seatIds = Array.isArray(source.seatIds) ? source.seatIds.map(String) : requestBody.seatIds;

  if (expiresAt === null || typeof holdToken !== 'string') {
    throw new Error('Invalid seat hold response');
  }

  return {
    holdToken,
    eventId,
    performanceId: String(source.performanceId ?? requestBody.performanceId),
    seatIds,
    expiresAt,
  };
}

export function getSeatApiErrorCode(error: unknown): string | null {
  if (!(error instanceof HttpError)) return null;
  const body = responseRecord(error.body);
  if (typeof body.code === 'string') return body.code;
  if (typeof body.error === 'string') return body.error;
  const nested = responseRecord(body.error);
  return typeof nested.code === 'string' ? nested.code : null;
}

export function isSeatReservationConflict(error: unknown): boolean {
  return (
    error instanceof HttpError &&
    error.status === 409 &&
    getSeatApiErrorCode(error) === 'SEAT_ALREADY_RESERVED'
  );
}

export class SeatApiClient {
  constructor(private readonly endpoints: SeatApiEndpointAdapter = defaultSeatApiEndpoints) {}

  async getAvailability(
    eventId: string,
    performanceId?: string
  ): Promise<SeatAvailabilityResponse> {
    const data = await request<unknown>(
      'GET',
      this.endpoints.availability(eventId, { performanceId, fresh: Date.now() })
    );
    return normalizeAvailability(eventId, performanceId || '', data);
  }

  async holdSeats(
    eventId: string,
    body: HoldSeatsRequest,
    idempotencyKey?: string
  ): Promise<SeatHold> {
    const data = await request<unknown>('POST', this.endpoints.hold(eventId), {
      body,
      headers: idempotencyHeader(idempotencyKey),
    });
    return normalizeHold(eventId, body, data);
  }

  async releaseHold(eventId: string, body: ReleaseSeatHoldRequest): Promise<void> {
    await request('DELETE', this.endpoints.hold(eventId), { body });
  }

  async getOrganizerLayout(
    eventId: string,
    performanceId: string
  ): Promise<OrganizerSeatLayoutResponse> {
    const data = await request<OrganizerSeatLayoutResponse | SeatLayout>(
      'GET',
      this.endpoints.organizerLayout(eventId, { performanceId })
    );
    if ('sections' in data) {
      return { eventId, performanceId, layout: data };
    }
    return data;
  }

  async saveOrganizerLayout(
    eventId: string,
    performanceId: string,
    layout: SeatLayout
  ): Promise<OrganizerSeatLayoutResponse> {
    return request<OrganizerSeatLayoutResponse>(
      'PUT',
      this.endpoints.organizerLayout(eventId, { performanceId }),
      { body: { performanceId, layout } }
    );
  }
}

export const SeatService = new SeatApiClient();
