// Shared TypeScript types for the AuraEvents web portal
// Aligned with Server-2025-Eventing API contracts

export interface EventLocation {
  address: string;
  latitude?: number;
  longitude?: number;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  date: number;
  imageUrl?: string;
  location: EventLocation;
  city?: string;
  venueName?: string;
  minPrice: number;
  category: string[];
  status?: 'draft' | 'submitted' | 'approved' | 'published' | 'rejected' | 'cancelled';
  organizerId?: string;
  capacity?: number;
}

export interface Seat {
  id: string;
  row: string;
  number: number;
  status: 'available' | 'held_by_you' | 'held' | 'booked';
  price?: number;
  section?: string;
}

export interface Ticket {
  id: string;
  eventId: string;
  userId: string;
  seatId?: string;
  ticketType: string;
  status: 'active' | 'cancelled' | 'used';
  purchasedAt: number;
}

export interface LedgerEntry {
  id: string;
  orderId: string;
  eventName: string;
  gross: number;
  fee: number;
  net: number;
  date: number;
}

export interface OrganizerEvent {
  id: string;
  name: string;
  status: string;
  sold: number;
  capacity: number;
  price: number;
}

export interface OrganizerStats {
  totalSales: number;
  grossRevenue: number;
  platformFees: number;
  netRevenue: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  message: string;
  statusCode?: number;
}
