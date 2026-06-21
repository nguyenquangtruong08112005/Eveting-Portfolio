export interface Seat {
  id: string;
  rowName: string;
  number: number;
  status: 'available' | 'held_by_you' | 'held_by_others' | 'blocked';
  sectionName: string;
}

export interface BackendSeat {
  id: string;
  seatSectionId: string;
  sectionName: string;
  priceMultiplier: number;
  rowName: string;
  seatNumber: number;
  status: 'available' | 'blocked' | 'sold' | 'held';
}
