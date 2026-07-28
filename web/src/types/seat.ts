export const MAX_SEATS_PER_HOLD = 10;
export const MAX_SEATS_PER_PERFORMANCE = 500;
export const SEAT_HOLD_DURATION_SECONDS = 10 * 60;

export type SeatAvailabilityStatus = 'AVAILABLE' | 'HELD' | 'SOLD' | 'BLOCKED';

export interface Seat {
  id: string;
  label: string;
  rowLabel: string;
  column: number;
  sectionId: string;
  sectionName: string;
  status: SeatAvailabilityStatus;
  heldByCurrentUser?: boolean;
  holdExpiresAt?: string | null;
  price?: number | null;
}

export interface SeatLayoutSeat {
  id: string;
  label: string;
  column: number;
  blocked: boolean;
}

export interface SeatLayoutRow {
  id: string;
  label: string;
  seats: SeatLayoutSeat[];
}

export interface SeatLayoutSection {
  id: string;
  name: string;
  rows: SeatLayoutRow[];
}

export interface SeatLayout {
  version: 1;
  sections: SeatLayoutSection[];
}

export interface SeatAvailabilityResponse {
  eventId: string;
  performanceId: string;
  seats: Seat[];
  currentHold?: SeatHold;
  fetchedAt?: string;
}

export interface SeatHold {
  holdToken: string;
  eventId: string;
  performanceId: string;
  seatIds: string[];
  expiresAt: string;
}

export interface HoldSeatsRequest {
  performanceId: string;
  seatIds: string[];
}

export interface ReleaseSeatHoldRequest {
  performanceId: string;
  holdToken: string;
  seatIds?: string[];
}

export interface OrganizerSeatLayoutResponse {
  eventId: string;
  performanceId: string;
  layout: SeatLayout;
  updatedAt?: string;
}

/**
 * Compatibility shape returned by the pre-Phase 06 ticket endpoint.
 * New seat-map code should use SeatAvailabilityResponse instead.
 */
export interface BackendSeat {
  id: string;
  seatSectionId: string;
  sectionName: string;
  priceMultiplier: number;
  rowName: string;
  seatNumber: number;
  status: 'available' | 'blocked' | 'sold' | 'held';
}
