export interface Ticket {
  id: string;
  eventId: string;
  userId: string;
  seatId?: string;
  ticketType: string;
  status: 'active' | 'cancelled' | 'used';
  purchasedAt: number;
}
