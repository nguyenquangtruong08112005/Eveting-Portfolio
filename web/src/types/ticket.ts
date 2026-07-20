export interface Ticket {
  id: string;
  eventId: string;
  userId: string;
  seatId?: string;
  ticketType: string;
  status: 'active' | 'cancelled' | 'used';
  purchasedAt: number;
  /** Server JWT / QR payload for venue check-in */
  qrCode?: string;
}

export interface TicketType {
  key: string;
  name: string;
  price: number;
  available: number;
  quantity?: number;
}

export interface TicketQuantities {
  [key: string]: number;
}

export interface VoucherResult {
  valid: boolean;
  discountType?: string;
  discountValue?: number;
  discountAmount?: number;
  maxDiscount?: number;
  message: string;
}
